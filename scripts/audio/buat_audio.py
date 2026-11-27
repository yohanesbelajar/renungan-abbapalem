#!/usr/bin/env python3
"""Buat audio renungan (TTS) untuk 7 hari terakhir, unggah ke Supabase Storage.

Jalankan dari akar proyek:
    python3 scripts/audio/buat_audio.py              # 7 hari terakhir
    python3 scripts/audio/buat_audio.py --hari 3
    python3 scripts/audio/buat_audio.py --slug 2026-11-26-tetap-melayani-dalam-penderitaan
    python3 scripts/audio/buat_audio.py --tanpa-bersih   # jangan hapus audio lama

Prinsip:
  * Audio TIDAK masuk database. Hanya berkas MP3 di bucket `audio-renungan`
    + manifest.json kecil (slug -> berkas, durasi, hash naskah).
  * Hash naskah dipakai supaya audio dibuat ulang hanya bila isi berubah.
  * Retensi: berkas yang tanggal renungannya lebih tua dari batas dihapus
    (bukan "dipindah" — ini cache audio yang memang harus kedaluwarsa;
    sumber aslinya tetap utuh di database).
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from naskah import bagian, naskah as buat_naskah  # noqa: E402

BUCKET = "audio-renungan"
# Suara wanita dipilih Jo 26 Nov 2026 setelah suara pria terdengar "pecah" pada
# kecepatan 0,75x. Tempo +7% menyetarakan kecepatan Gadis dengan Ardi -15%
# (terukur sama-sama 20,4 karakter/detik); tanpa itu Gadis terasa lebih lambat.
SUARA = "id-ID-GadisNeural"
TEMPO = "+7%"
BITRATE = "48k"
MAKS_PARAGRAF = 900          # karakter per permintaan TTS
JEDA_MS = 420                # jeda antar paragraf
WIB = timezone(timedelta(hours=7))


# ------------------------------------------------------------------ lingkungan

def muat_env() -> dict[str, str]:
    env = {}
    jalur = os.path.join(os.getcwd(), ".env.local")
    if os.path.exists(jalur):
        for baris in open(jalur):
            baris = baris.strip()
            if baris and not baris.startswith("#") and "=" in baris:
                k, v = baris.split("=", 1)
                env[k.strip()] = v.strip().strip('"').strip("'")
    # variabel proses menang atas berkas
    for k in ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    for k in ("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"):
        if not env.get(k):
            sys.exit(f"FATAL: {k} tidak ada (.env.local atau environment)")
    return env


class Supa:
    def __init__(self, env: dict[str, str]):
        self.url = env["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
        self.key = env["SUPABASE_SERVICE_ROLE_KEY"]

    def _req(self, metode: str, jalur: str, data: bytes | None = None, tipe: str | None = None):
        r = urllib.request.Request(self.url + jalur, data=data, method=metode)
        r.add_header("Authorization", "Bearer " + self.key)
        r.add_header("apikey", self.key)
        if tipe:
            r.add_header("Content-Type", tipe)
        return r

    def json(self, metode: str, jalur: str, isi=None) -> object:
        data = json.dumps(isi).encode() if isi is not None else None
        with urllib.request.urlopen(self._req(metode, jalur, data, "application/json"), timeout=60) as res:
            badan = res.read()
        return json.loads(badan) if badan else None

    def unggah(self, nama: str, isi: bytes, tipe: str) -> None:
        req = self._req("POST", f"/storage/v1/object/{BUCKET}/{nama}", isi, tipe)
        req.add_header("x-upsert", "true")
        with urllib.request.urlopen(req, timeout=180) as res:
            res.read()

    def unduh(self, nama: str) -> bytes | None:
        try:
            with urllib.request.urlopen(
                self._req("GET", f"/storage/v1/object/{BUCKET}/{nama}"), timeout=60
            ) as res:
                return res.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                return None
            raise

    def hapus(self, nama: str) -> None:
        req = self._req("DELETE", f"/storage/v1/object/{BUCKET}/{nama}", b"{}", "application/json")
        with urllib.request.urlopen(req, timeout=60) as res:
            res.read()

    def pastikan_bucket(self) -> None:
        try:
            self.json("POST", "/storage/v1/bucket", {
                "id": BUCKET, "name": BUCKET, "public": True,
                "file_size_limit": 20 * 1024 * 1024,
                "allowed_mime_types": ["audio/mpeg", "application/json"],
            })
            print(f"bucket {BUCKET} dibuat (publik)")
        except urllib.error.HTTPError as e:
            if e.code not in (400, 409):
                raise
            # sudah ada — pastikan publik
            try:
                self.json("PUT", f"/storage/v1/bucket/{BUCKET}", {"public": True})
            except Exception:
                pass


def unduh_manifest(supa: Supa) -> dict:
    mentah = supa.unduh("manifest.json")
    return json.loads(mentah) if mentah else {}


def simpan_manifest(supa: Supa, man: dict) -> None:
    isi = json.dumps(man, ensure_ascii=False, indent=1, sort_keys=True).encode()
    supa.unggah("manifest.json", isi, "application/json")


# ----------------------------------------------------------------------- TTS


# Jeda setelah tiap jenis bagian (milidetik).
#   ayat  — henti setelah rujukan ayat pembuka, sebelum konteks renungan
#   isi   — antar KALIMAT di dalam isi renungan (Edge TTS hanya beri ~0,40 dtk
#           setelah titik; Jo minta dua kali, jadi ditambah jeda sisipan)
#   paragraf — tambahan di akhir paragraf supaya batas paragraf tetap terasa
JEDA = {"judul": 800, "ayat": 1170, "label": 500}
JEDA_KALIMAT = 470      # + sisa ekor ~0,33 dtk -> terukur ~0,80 dtk (2x dari 0,40)
JEDA_PARAGRAF = 250     # tambahan di kalimat terakhir sebuah paragraf


def potong_kalimat(teks: str, maks: int = MAKS_PARAGRAF) -> list[str]:
    """Pecah satu paragraf jadi kalimat utuh (batas titik/tanya/seru).

    Kalimat pendek digabung ke kalimat sebelumnya, dan kalimat yang diakhiri
    titik dua atau koma tidak dipecah — memecahnya membuat intonasi turun di
    tengah pikiran.
    """
    kasar = re.split(r"(?<=[.!?])\s+", teks.strip())
    gabung: list[str] = []
    for k in kasar:
        k = k.strip()
        if not k:
            continue
        if gabung and (len(k) < 40 or gabung[-1].rstrip().endswith((":", ","))):
            gabung[-1] = gabung[-1] + " " + k
        else:
            gabung.append(k)
    # jaga batas ukuran permintaan TTS
    hasil: list[str] = []
    for k in gabung:
        if len(k) <= maks:
            hasil.append(k)
            continue
        buf = ""
        for bagian_k in re.split(r"(?<=[.!?])\s+", k):
            if len(buf) + len(bagian_k) + 1 <= maks:
                buf = (buf + " " + bagian_k).strip()
            else:
                if buf:
                    hasil.append(buf)
                buf = bagian_k
        if buf:
            hasil.append(buf)
    return hasil


def pecah_berjeda(isi_html: str, judul: str | None) -> list[tuple[str, int]]:
    """Naskah -> [(potongan teks, jeda setelahnya ms)]."""
    keluar: list[tuple[str, int]] = []
    for teks, jenis in bagian(isi_html, judul):
        if jenis == "isi":
            kalimat = potong_kalimat(teks)
            for i, k in enumerate(kalimat):
                akhir = i == len(kalimat) - 1
                keluar.append((k, JEDA_KALIMAT + (JEDA_PARAGRAF if akhir else 0)))
        else:
            keluar.append((teks, JEDA.get(jenis, JEDA_KALIMAT)))
    return keluar


async def ucap(teks: str, keluar: str, coba: int = 3) -> None:
    """Sintesis satu potongan, lalu pangkas sunyi di ujungnya.

    Edge TTS menyisakan ekor sunyi ±1,2 detik. Tanpa dipangkas, jeda antar
    bagian jadi jauh lebih panjang dari yang dirancang (3,5 dtk bukan 2,2).
    """
    import edge_tts

    mentah = keluar + ".raw.mp3"
    for n in range(1, coba + 1):
        try:
            await asyncio.wait_for(
                edge_tts.Communicate(teks, SUARA, rate=TEMPO).save(mentah), 180
            )
            if os.path.getsize(mentah) > 1000:
                break
            raise RuntimeError("berkas terlalu kecil")
        except Exception as e:
            if n == coba:
                raise RuntimeError(f"TTS gagal setelah {coba} coba: {e}") from e
            await asyncio.sleep(1.5 * n)

    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", mentah, "-af",
         "silenceremove=stop_periods=-1:stop_silence=0.10:stop_threshold=-45dB",
         "-c:a", "libmp3lame", "-b:a", BITRATE, "-ac", "1", "-ar", "24000", keluar],
        check=True,
    )
    os.remove(mentah)


def gabung(potongan: list[tuple[str, int]], folder: str, keluar: str) -> None:
    """Gabung mp3 per potongan + jeda sesuai jenis bagian, encode mono 24 kHz."""
    daftar = os.path.join(folder, "daftar.txt")
    with open(daftar, "w") as f:
        for i, (berkas, jeda_ms) in enumerate(potongan):
            f.write(f"file '{berkas}'\n")
            if i != len(potongan) - 1 and jeda_ms > 0:
                sunyi = os.path.join(folder, f"jeda{i:03d}.mp3")
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i",
                     "anullsrc=r=24000:cl=mono", "-t", f"{jeda_ms/1000:.3f}",
                     "-c:a", "libmp3lame", "-b:a", "48k", sunyi],
                    check=True,
                )
                f.write(f"file '{sunyi}'\n")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
         "-i", daftar, "-c:a", "libmp3lame", "-b:a", BITRATE, "-ac", "1",
         "-ar", "24000", keluar],
        check=True,
    )


def durasi(berkas: str) -> int:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", berkas],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return int(round(float(out)))


# ---------------------------------------------------------------------- utama

def ambil_renungan(supa: Supa, sejak: str, slug: str | None) -> list[dict]:
    if slug:
        jalur = (f"/rest/v1/devotions?select=id,slug,title,body,devotion_date"
                 f"&slug=eq.{slug}&status=eq.published")
    else:
        jalur = (f"/rest/v1/devotions?select=id,slug,title,body,devotion_date"
                 f"&status=eq.published&devotion_date=gte.{sejak}"
                 f"&order=devotion_date.asc")
    hasil = supa.json("GET", jalur) or []
    return hasil if isinstance(hasil, list) else []


def hash_naskah(teks: str) -> str:
    # "jeda-v5": skema jeda + pemangkasan sunyi ikut menentukan hasil audio,
    # jadi perubahan skema wajib membuat ulang audio lama.
    return hashlib.sha256(
        (teks + "|" + SUARA + "|" + TEMPO + "|jeda-v5").encode()
    ).hexdigest()[:16]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--hari", type=int, default=7, help="retensi & cakupan hari (default 7)")
    ap.add_argument("--slug", help="hanya satu edisi")
    ap.add_argument("--tanpa-bersih", action="store_true", help="jangan hapus audio kedaluwarsa")
    ap.add_argument("--paksa", action="store_true", help="buat ulang walau hash sama")
    ap.add_argument("--kering", action="store_true", help="hitung saja, tanpa TTS/unggah")
    a = ap.parse_args()

    env = muat_env()
    supa = Supa(env)
    supa.pastikan_bucket()

    hari_ini = datetime.now(WIB).date()
    batas = hari_ini - timedelta(days=a.hari - 1)
    man = unduh_manifest(supa)

    rows = ambil_renungan(supa, batas.isoformat(), a.slug)
    print(f"cakupan: {batas} .. {hari_ini} | {len(rows)} edisi terbit")

    dibuat = dilewati = gagal = 0
    for row in rows:
        slug = row["slug"]
        teks = buat_naskah(row["body"], row["title"])
        h = hash_naskah(teks)
        lama = man.get(slug)
        if not a.paksa and lama and lama.get("hash") == h:
            dilewati += 1
            print(f"  = {slug} (sudah ada, {lama.get('durasi')} dtk)")
            continue

        nama = f"{slug}.mp3"
        if a.kering:
            print(f"  + {slug}: {len(teks)} char naskah (~{len(teks)/15.2/60:.1f} menit)")
            dibuat += 1
            continue

        folder = tempfile.mkdtemp(prefix="ttsaudio-")
        try:
            bag = pecah_berjeda(row["body"], row["title"])
            berkas: list[tuple[str, int]] = []
            t0 = time.time()
            for i, (p, jeda_ms) in enumerate(bag):
                f = os.path.join(folder, f"p{i:03d}.mp3")
                asyncio.run(ucap(p, f))
                berkas.append((f, jeda_ms))
            hasil = os.path.join(folder, "hasil.mp3")
            gabung(berkas, folder, hasil)
            detik = durasi(hasil)
            ukuran = os.path.getsize(hasil)
            supa.unggah(nama, open(hasil, "rb").read(), "audio/mpeg")
            man[slug] = {
                "berkas": nama,
                "durasi": detik,
                "ukuran": ukuran,
                "hash": h,
                "judul": row["title"],
                "tanggal": row["devotion_date"],
                "dibuat": datetime.now(WIB).isoformat(timespec="seconds"),
                "suara": SUARA,
                "tempo": TEMPO,
            }
            simpan_manifest(supa, man)
            dibuat += 1
            print(f"  + {slug}: {len(bag)} potong, {detik} dtk, "
                  f"{ukuran/1024:.0f} KB, {time.time()-t0:.0f}s")
        except Exception as e:
            gagal += 1
            print(f"  ! {slug} GAGAL: {type(e).__name__}: {e}")
        finally:
            shutil.rmtree(folder, ignore_errors=True)

    if not a.tanpa_bersih and not a.kering:
        # Retensi bergulir (perintah Jo 27 Nov 2026): 1 rekaman baru = 1 rekaman
        # tertua dihapus, sehingga jumlah rekaman tetap 7.
        #  * jendela tanggal tetap: slug di luar 7 hari terakhir dibuang;
        #  * plafon jumlah: kalau masih lebih dari 7 (mis. audio lama yang
        #    tanggalnya dekat), buang yang tanggalnya paling awal.
        hari_ini_iso = hari_ini.isoformat()
        kandidat = sorted(
            (s for s in man
             if (man[s].get("tanggal") or "9999") < batas.isoformat()
             or (man[s].get("tanggal") or "") > hari_ini_iso),
            key=lambda s: (man[s].get("tanggal") or "9999", s),
        )
        sisa = len(man) - len(kandidat)
        if sisa > a.hari:
            lebih = [s for s in man
                     if s not in kandidat and (man[s].get("tanggal") or "")]
            lebih.sort(key=lambda s: (man[s]["tanggal"], s))
            kandidat += lebih[: sisa - a.hari]
        hapus = kandidat
        for s in hapus:
            try:
                supa.hapus(man[s]["berkas"])
            except Exception as e:
                print(f"  ! hapus {s} gagal: {e}")
                continue
            del man[s]
            print(f"  - {s} (kedaluwarsa, {len(hapus)} berkas)")
        if hapus:
            simpan_manifest(supa, man)

    print(f"\nringkas: dibuat {dibuat}, dilewati {dilewati}, gagal {gagal}, "
          f"total di manifest {len(man)}")
    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
