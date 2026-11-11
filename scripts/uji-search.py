#!/usr/bin/env python3
"""Uji pencarian /arsip: kartu, baris hitungan, catatan longgar, filter.

Pakai: python3 uji-search.py [base-url]   (default http://localhost:3000)
Syarat lolos: GAGAL kosong.
"""
import re, subprocess, sys, urllib.parse

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3000"


def ambil(qs):
    return subprocess.run(["curl", "-s", f"{BASE}/arsip{qs}"],
                          capture_output=True, text=True).stdout


def metrik(html):
    kartu = html.count('href="/saat-teduh/')
    kosong = "Tidak ada saat teduh yang cocok" in html
    galat = "Pencarian gagal dijalankan" in html
    longgar = "Hasil persis tidak ada" in html
    m = re.search(r'<strong[^>]*>(\d+)</strong>\s*(?:<!-- -->\s*)?saat teduh', html)
    hitung = int(m.group(1)) if m else None
    return kartu, hitung, longgar, kosong, galat


TERMS = ["kasih", "doa", "iman", "Yoh 3:16", "Mat 5", "Mzm 23", "1 Kor 13",
         "Matius 9", "Matius9", "jiwa-jiwa", "kasih allah", "roma 8:28",
         "kiamat", "penebusan", "1 Tes 2:2", "Kis 2", "salib iman",
         "harapan baru", "kasih pengampunan", "mazmur 23",
         'jiwa', '"jiwa"', '“jiwa”', 'jiwa.']  # kutip & titik: harus tetap sama jumlahnya

print(f"{'istilah':22} {'kartu':>6} {'baris':>6} {'longgar':>8} {'kosong':>7} {'galat':>6}")
gagal = []
for t in TERMS:
    qs = "?" + urllib.parse.urlencode({"cari": t})
    k, h, lg, ks, gt = metrik(ambil(qs))
    tanda = ""
    if ks:
        tanda = " (memang nol di DB)" if t in ("kiamat",) else "  !! KOSONG"
    if gt:
        tanda += "  !! GALAT"
    print(f"{t:22} {k:>6} {str(h):>6} {str(lg):>8} {str(ks):>7} {str(gt):>6}{tanda}")
    if gt or (t != "kiamat" and k == 0):
        gagal.append(t)
    if t.strip('"“”.') == "jiwa" and k == 0:
        gagal.append(f"jiwa({t!r}) = {k}, kosong")

# gabungan filter
k, h, *_ = metrik(ambil("?" + urllib.parse.urlencode({"cari": "kasih", "bulan": "2026-03"})))
print(f"\nkasih+Maret 2026: kartu={k} baris={h} (harus cocok & <=31)")
if k != h or k == 0:
    gagal.append("filter bulan+kata")
k2, h2, *_ = metrik(ambil("?" + urllib.parse.urlencode({"tema": "Jiwa-jiwa"})))
print(f"filter tema Jiwa-jiwa: kartu={k2} baris={h2}")
if k2 != h2 or k2 == 0:
    gagal.append("filter tema")

# halaman tanpa filter = pilih tahun: tanpa kartu judul, tanpa baris hitungan,
# dan tepat 3 pilihan tahun (rancangan baru 12 Nov 2026)
tanpa = ambil("")
kartu_tanpa = tanpa.count('href="/saat-teduh/')
ada_baris = bool(re.search(r'</strong>(?:<!-- -->)?\s*saat teduh (?:ditemukan|cocok)', tanpa))
pilihan_tahun = len(re.findall(r'href="/arsip\?tahun=\d{4}"', tanpa))
print(f"halaman pilih tahun: kartu={kartu_tanpa}, pilihan tahun={pilihan_tahun}, "
      f"baris hitungan muncul={ada_baris} (harus 0, 3, False)")
if kartu_tanpa != 0 or pilihan_tahun != 3 or ada_baris:
    gagal.append("halaman pilih tahun")

print("\nGAGAL:", gagal if gagal else "tidak ada")
sys.exit(1 if gagal else 0)
