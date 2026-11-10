#!/usr/bin/env python3
"""Unduh teks Alkitab Terjemahan Baru (TB) dari alkitab.mobi, simpan sebagai
JSON per kitab di public/alkitab/<kode>.json.

Pemakaian:
    python3 scripts/unduh-alkitab.py            # unduh semua (melewati yang sudah ada)
    python3 scripts/unduh-alkitab.py --ulang     # paksa unduh ulang semua

Struktur keluaran per kitab:
    {"nama": "Yesaya", "kode": "Yes", "pasal": [["ayat 1", "ayat 2", ...], ...]}

Sumber: Alkitab Mobile SABDA (https://alkitab.mobi), teks Terjemahan Baru.
Hak cipta teks: © LAI 1974 — kredit wajib ditampilkan di situs.
"""
import html
import json
import re
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

AKAR = Path(__file__).resolve().parent.parent
KELUARAN = AKAR / "public" / "alkitab"
UA = "Mozilla/5.0 (compatible; AbbalovePalemSiteBuilder/1.0; +https://sate-alpalem.xyz)"

# (kode alkitab.mobi, nama kitab sesuai TB)
BUKU = [
    ("Kej", "Kejadian"), ("Kel", "Keluaran"), ("Ima", "Imamat"), ("Bil", "Bilangan"),
    ("Ula", "Ulangan"), ("Yos", "Yosua"), ("Hak", "Hakim-hakim"), ("Rut", "Rut"),
    ("1Sa", "1 Samuel"), ("2Sa", "2 Samuel"), ("1Ra", "1 Raja-raja"), ("2Ra", "2 Raja-raja"),
    ("1Ta", "1 Tawarikh"), ("2Ta", "2 Tawarikh"), ("Ezr", "Ezra"), ("Neh", "Nehemia"),
    ("Est", "Ester"), ("Ayb", "Ayub"), ("Mzm", "Mazmur"), ("Ams", "Amsal"),
    ("Pkh", "Pengkhotbah"), ("Kid", "Kidung Agung"), ("Yes", "Yesaya"), ("Yer", "Yeremia"),
    ("Rat", "Ratapan"), ("Yeh", "Yeheskiel"), ("Dan", "Daniel"), ("Hos", "Hosea"),
    ("Yoe", "Yoel"), ("Amo", "Amos"), ("Oba", "Obaja"), ("Yun", "Yunus"),
    ("Mik", "Mika"), ("Nah", "Nahum"), ("Hab", "Habakuk"), ("Zef", "Zefanya"),
    ("Hag", "Hagai"), ("Zak", "Zakharia"), ("Mal", "Maleakhi"), ("Mat", "Matius"),
    ("Mrk", "Markus"), ("Luk", "Lukas"), ("Yoh", "Yohanes"), ("Kis", "Kisah Para Rasul"),
    ("Rom", "Roma"), ("1Ko", "1 Korintus"), ("2Ko", "2 Korintus"), ("Gal", "Galatia"),
    ("Efe", "Efesus"), ("Flp", "Filipi"), ("Kol", "Kolose"), ("1Te", "1 Tesalonika"),
    ("2Te", "2 Tesalonika"), ("1Ti", "1 Timotius"), ("2Ti", "2 Timotius"), ("Tit", "Titus"),
    ("Flm", "Filemon"), ("Ibr", "Ibrani"), ("Yak", "Yakobus"), ("1Pt", "1 Petrus"),
    ("2Pt", "2 Petrus"), ("1Yo", "1 Yohanes"), ("2Yo", "2 Yohanes"), ("3Yo", "3 Yohanes"),
    ("Yud", "Yudas"), ("Why", "Wahyu"),
]

RE_PARAGRAF = re.compile(r'<p><span class="paragraphtitle">(.*?)</span></p>', re.S)
RE_AYAT = re.compile(
    r'<p><span class="reftext"><a name=v(\d+)[^>]*>\d+</a></span>(.*?)</p>', re.S)
RE_TAG = re.compile(r"<[^>]+>")
RE_SPASI = re.compile(r"\s+")


def ambil(url: str, percobaan: int = 3) -> str:
    for i in range(percobaan):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # jaringan/rate limit — coba lagi
            if i == percobaan - 1:
                raise
            time.sleep(1.5 * (i + 1))
    raise RuntimeError("tidak tercapai")


def jumlah_pasal(kode: str) -> int:
    """Jumlah pasal kitab dari halaman daftar pasal."""
    h = ambil(f"https://alkitab.mobi/tb/{kode}/")
    nomor = {int(m) for m in re.findall(rf'href="https://alkitab\.mobi/tb/{kode}/(\d+)/"', h)}
    if not nomor:
        raise RuntimeError(f"daftar pasal {kode} kosong")
    return max(nomor)


def unduh_pasal(kode: str, nama: str, pasal: int) -> list:
    h = ambil(f"https://alkitab.mobi/tb/{kode}/{pasal}/")
    isi = h.split('<div id="passage-text"', 1)
    if len(isi) < 2:
        raise RuntimeError(f"{kode} {pasal}: bagian teks tidak ada")
    blok = isi[1].split("</div>", 1)[0]
    blok = RE_PARAGRAF.sub("", blok)
    ayat = []
    for m in RE_AYAT.finditer(blok):
        nomor = int(m.group(1))
        teks = RE_TAG.sub(" ", m.group(2))
        teks = RE_SPASI.sub(" ", html.unescape(teks)).strip()
        if not teks:
            continue
        if nomor != len(ayat) + 1:
            raise RuntimeError(f"{kode} {pasal}: ayat {nomor} setelah {len(ayat)}")
        ayat.append(teks)
    if not ayat:
        raise RuntimeError(f"{kode} {pasal}: tidak ada ayat")
    return ayat


def unduh_kitab(kode: str, nama: str) -> dict:
    berkas = KELUARAN / f"{kode.lower()}.json"
    n = jumlah_pasal(kode)
    pasal = []
    for c in range(1, n + 1):
        pasal.append(unduh_pasal(kode, nama, c))
        time.sleep(0.05)
    data = {"nama": nama, "kode": kode, "pasal": pasal}
    berkas.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                      encoding="utf-8")
    total = sum(len(p) for p in pasal)
    return {"kitab": nama, "pasal": n, "ayat": total, "kb": berkas.stat().st_size // 1024}


def main() -> int:
    KELUARAN.mkdir(parents=True, exist_ok=True)
    paksa = "--ulang" in sys.argv
    todo = [(k, n) for k, n in BUKU
            if paksa or not (KELUARAN / f"{k.lower()}.json").exists()]
    print(f"mengunduh {len(todo)} kitab...", flush=True)
    gagal = []
    with ThreadPoolExecutor(max_workers=4) as ex:
        tugas = {ex.submit(unduh_kitab, k, n): (k, n) for k, n in todo}
        for f in as_completed(tugas):
            k, n = tugas[f]
            try:
                h = f.result()
                print(f"OK  {h['kitab']:<18} {h['pasal']:>3} pasal "
                      f"{h['ayat']:>4} ayat {h['kb']:>4} KB", flush=True)
            except Exception as e:
                gagal.append((k, n, str(e)))
                print(f"GAGAL {n}: {e}", flush=True)
    if gagal:
        print(f"\n{len(gagal)} kitab gagal:", flush=True)
        for k, n, e in gagal:
            print(f"  {n} ({k}): {e}", flush=True)
        return 1
    print("\nselesai — semua kitab terunduh.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
