#!/usr/bin/env python3
"""Naskah bicara dari HTML saat teduh.

HTML editor Tiptap -> kalimat yang enak dibacakan mesin TTS Bahasa Indonesia:
rujukan ayat dieja ("Gal 6:2" -> "Galatia pasal enam ayat dua"), label dan
instruksi yang tidak perlu didengar dibuang, angka kecil jadi kata.

Dipakai scripts/audio/buat_audio.py. Jangan mengubah perilaku tanpa menguji
pada edisi nyata (lihat --uji).
"""

from __future__ import annotations

import html as _html
import re

# ---------------------------------------------------------------- angka -> kata

_SATU = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh",
         "delapan", "sembilan", "sepuluh", "sebelas"]


def angka_id(n: int) -> str:
    """1..999 dalam kata Bahasa Indonesia."""
    if n <= 0:
        return str(n)
    if n < 12:
        return _SATU[n]
    if n < 20:
        return _SATU[n - 10] + " belas"
    if n < 100:
        puluh, sisa = divmod(n, 10)
        return _SATU[puluh] + " puluh" + (" " + _SATU[sisa] if sisa else "")
    ratus, sisa = divmod(n, 100)
    depan = "seratus" if ratus == 1 else _SATU[ratus] + " ratus"
    return depan + (" " + angka_id(sisa) if sisa else "")


# ------------------------------------------------------------ nama kitab Alkitab

KANONIK = [
    "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", "Yosua", "Hakim-hakim", "Rut",
    "1 Samuel", "2 Samuel", "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh",
    "Ezra", "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal", "Pengkhotbah", "Kidung Agung",
    "Yesaya", "Yeremia", "Ratapan", "Yeheskiel", "Daniel", "Hosea", "Yoel", "Amos",
    "Obaja", "Yunus", "Mika", "Nahum", "Habakuk", "Zefanya", "Hagai", "Zakharia",
    "Maleakhi", "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", "Roma",
    "1 Korintus", "2 Korintus", "Galatia", "Efesus", "Filipi", "Kolose",
    "1 Tesalonika", "2 Tesalonika", "1 Timotius", "2 Timotius", "Titus", "Filemon",
    "Ibrani", "Yakobus", "1 Petrus", "2 Petrus", "1 Yohanes", "2 Yohanes", "3 Yohanes",
    "Yudas", "Wahyu",
]

SINGKATAN = {
    "Kej": "Kejadian", "Kel": "Keluaran", "Ima": "Imamat", "Bil": "Bilangan",
    "Ula": "Ulangan", "Yos": "Yosua", "Hak": "Hakim-hakim", "Rut": "Rut",
    "1Sa": "1 Samuel", "1Sam": "1 Samuel", "2Sa": "2 Samuel", "2Sam": "2 Samuel",
    "1Ra": "1 Raja-raja", "1Raj": "1 Raja-raja", "2Ra": "2 Raja-raja", "2Raj": "2 Raja-raja",
    "1Ta": "1 Tawarikh", "1Taw": "1 Tawarikh", "2Ta": "2 Tawarikh", "2Taw": "2 Tawarikh",
    "Ezr": "Ezra", "Neh": "Nehemia", "Est": "Ester", "Ayb": "Ayub", "Mzm": "Mazmur",
    "Maz": "Mazmur", "Ams": "Amsal", "Pkh": "Pengkhotbah", "Kid": "Kidung Agung",
    "Yes": "Yesaya", "Yer": "Yeremia", "Rat": "Ratapan", "Yeh": "Yeheskiel", "Dan": "Daniel",
    "Hos": "Hosea", "Yoe": "Yoel", "Amo": "Amos", "Oba": "Obaja", "Yun": "Yunus",
    "Mik": "Mika", "Nah": "Nahum", "Hab": "Habakuk", "Zef": "Zefanya", "Hag": "Hagai",
    "Zak": "Zakharia", "Mal": "Maleakhi",
    "Mat": "Matius", "Mrk": "Markus", "Mar": "Markus", "Luk": "Lukas",
    "Yoh": "Yohanes", "Kis": "Kisah Para Rasul", "Roma": "Roma", "Rom": "Roma",
    "1Ko": "1 Korintus", "1Kor": "1 Korintus", "2Ko": "2 Korintus", "2Kor": "2 Korintus",
    "Gal": "Galatia", "Efe": "Efesus", "Ef": "Efesus", "Flp": "Filipi", "Fil": "Filipi",
    "Kol": "Kolose",
    "1Te": "1 Tesalonika", "1Tes": "1 Tesalonika", "2Te": "2 Tesalonika",
    "2Tes": "2 Tesalonika",
    "1Ti": "1 Timotius", "1Tim": "1 Timotius", "2Ti": "2 Timotius", "2Tim": "2 Timotius",
    "Tit": "Titus", "Flm": "Filemon", "Ibr": "Ibrani", "Yak": "Yakobus",
    "1Pe": "1 Petrus", "1Pet": "1 Petrus", "2Pe": "2 Petrus", "2Pet": "2 Petrus",
    "1Yo": "1 Yohanes", "1Yoh": "1 Yohanes", "2Yo": "2 Yohanes", "2Yoh": "2 Yohanes",
    "3Yo": "3 Yohanes", "3Yoh": "3 Yohanes", "Yud": "Yudas", "Why": "Wahyu",
    "Mzm.": "Mazmur",
}

# Nama kitab bernomor dibaca "Satu Petrus", "Dua Timotius".
_NOMOR_AWAL = {"1": "Satu", "2": "Dua", "3": "Tiga"}


def _nama_kitab_ucap(nama: str) -> str:
    bagian = nama.split(" ", 1)
    if len(bagian) == 2 and bagian[0] in _NOMOR_AWAL:
        return _NOMOR_AWAL[bagian[0]] + " " + bagian[1]
    return nama


# Semua bentuk yang dikenali: singkatan + nama penuh, terpanjang lebih dulu.
_TOKEN_KITAB = {}
for _k, _v in SINGKATAN.items():
    _TOKEN_KITAB[_k] = _v
for _n in KANONIK:
    _TOKEN_KITAB[_n] = _n
    _TOKEN_KITAB[_n.replace("-", " ")] = _n

_POLA_KITAB = "|".join(
    re.escape(t) for t in sorted(_TOKEN_KITAB, key=len, reverse=True)
)

# "Gal 6:2", "1 Petrus 4:12-13", "Mzm 23", "Yes 6:1-8", "Roma 8:28,29"
_RE_RUJUKAN = re.compile(
    r"(?<![\w.])(" + _POLA_KITAB + r")\.?\s*"
    r"(\d{1,3})"
    r"(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–—]\s*(\d{1,3}))?"
    r"((?:\s*[,;]\s*\d{1,3})*))?(?![\w])"
)


def _ucap_rujukan(m: re.Match) -> str:
    kitab = _nama_kitab_ucap(_TOKEN_KITAB[m.group(1)])
    pasal = int(m.group(2))
    out = f"{kitab} pasal {angka_id(pasal)}"
    ayat = m.group(3)
    if ayat:
        out += f" ayat {angka_id(int(ayat))}"
        if m.group(4):
            out += f" sampai {angka_id(int(m.group(4)))}"
        for lagi in re.findall(r"\d{1,3}", m.group(5) or ""):
            out += f" dan {angka_id(int(lagi))}"
    return out


# ------------------------------------------------------------------ praproses

# Kalimat instruksi yang tidak perlu didengar; isi pertanyaannya tetap dibaca.
_BUANG_KALIMAT = [
    re.compile(r"Bacalah beberapa kali ayat di atas[^.!?]*[.!?:]?", re.I),
    re.compile(r"kemudian renungkan dan jawablah pertanyaan-pertanyaan berikut ini\s*:?", re.I),
    re.compile(r"^\(?TB\)?$", re.I),
]

_LABEL = re.compile(r"^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan|Penutup)\s*:?\s*$", re.I)


def _entitas(teks: str) -> str:
    teks = _html.unescape(teks)
    return teks.replace("\u00a0", " ").replace("\u200b", "")


def _blok_html(isi: str) -> list[str]:
    """Pecah HTML jadi blok teks; satu blok = satu paragraf/butir."""
    isi = re.sub(r"(?is)<(script|style)\b.*?</\1>", " ", isi)
    # batas blok: penutup/ pembuka elemen blok
    isi = re.sub(r"(?i)<br\s*/?>", "\n", isi)
    isi = re.sub(r"(?i)</(p|h[1-6]|li|blockquote|td|th|div)>", "\n", isi)
    isi = re.sub(r"(?i)<(p|h[1-6]|li|blockquote|tr|div)\b[^>]*>", "\n", isi)
    isi = re.sub(r"<[^>]+>", " ", isi)
    isi = _entitas(isi)
    baris = []
    for b in isi.split("\n"):
        b = re.sub(r"\s+", " ", b).strip()
        if b:
            baris.append(b)
    return baris


def naskah(isi_html: str, judul: str | None = None) -> str:
    """HTML saat teduh -> naskah siap dibacakan (paragraf dipisah baris kosong)."""
    paragraf: list[str] = []
    if judul:
        paragraf.append(_bersih(judul.rstrip(".")))

    for b in _blok_html(isi_html):
        cocok = _LABEL.match(b)
        if cocok:
            # "Pengajaran:" dibaca sebagai penanda bagian, tanpa titik dua.
            paragraf.append(cocok.group(1))
            continue
        t = b
        for pola in _BUANG_KALIMAT:
            t = pola.sub(" ", t)
        t = _bersih(t)
        if t:
            paragraf.append(t)

    # Gabungkan blok pendek berurutan (butir daftar, potongan tabel) supaya
    # tidak terdengar terputus-putus satu kalimat per audio.
    hasil: list[str] = []
    mulai_gabung = 1 if judul else 0
    for i, p in enumerate(paragraf):
        if (
            i > mulai_gabung
            and hasil
            and len(hasil[-1]) < 180
            and len(p) < 180
            and not hasil[-1].endswith((".", "?", "!"))
        ):
            hasil[-1] = hasil[-1] + " " + p
        else:
            hasil.append(p)
    return "\n\n".join(hasil)


def _bersih(t: str) -> str:
    t = re.sub(r"\(TB\)", " ", t)
    t = re.sub(r"\s*[—–]\s*", ", ", t)          # pisau em-dash -> jeda koma
    t = re.sub(r"[\"“”„]", "", t)
    t = re.sub(r"\s+([,.;:!?])", r"\1", t)
    t = re.sub(r"([,.;:!?])(?=[^\s])", r"\1 ", t)
    t = re.sub(r"\s{2,}", " ", t).strip(" ,;:")
    # rujukan ayat setelah label dibuang
    t = _RE_RUJUKAN.sub(_ucap_rujukan, t)
    # sisa "ayat 3-5" tanpa nama kitab
    t = re.sub(r"\bayat\s+(\d{1,3})\s*[-–—]\s*(\d{1,3})\b",
               lambda m: f"ayat {angka_id(int(m.group(1)))} sampai {angka_id(int(m.group(2)))}", t, flags=re.I)
    t = re.sub(r"\bpasal\s+(\d{1,3})\b",
               lambda m: f"pasal {angka_id(int(m.group(1)))}", t, flags=re.I)
    # "Galatia 6" sisa (tanpa titik dua)
    return t.strip()


# ------------------------------------------------------------------------ uji

if __name__ == "__main__":
    import json
    import sys
    import urllib.request

    _env = {}
    for _l in open(".env.local"):
        _l = _l.strip()
        if _l and not _l.startswith("#") and "=" in _l:
            _k, _v = _l.split("=", 1)
            _env[_k] = _v.strip().strip('"').strip("'")
    _url = _env["NEXT_PUBLIC_SUPABASE_URL"]
    _key = _env["SUPABASE_SERVICE_ROLE_KEY"]
    _n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    _r = urllib.request.Request(
        f"{_url}/rest/v1/devotions?select=slug,title,body&status=eq.published"
        f"&order=devotion_date.desc&limit={_n}",
        headers={"Authorization": "Bearer " + _key, "apikey": _key},
    )
    for _row in json.loads(urllib.request.urlopen(_r, timeout=30).read()):
        _t = naskah(_row["body"], _row["title"])
        print("=" * 70)
        print(_row["slug"], len(_row["body"]), "->", len(_t))
        print(_t[:1400])
