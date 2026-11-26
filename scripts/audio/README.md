# Audio renungan

Audio "dengarkan renungan" dibuat **di mesin ini** (bukan di server situs), lalu
disimpan sebagai MP3 di Supabase Storage. Situs hanya memutar berkas itu.

Kenapa begini: pembuatan TTS butuh 1–2 menit per edisi. Vercel memotong function
pada 10–60 detik, jadi audio tidak boleh dibuat saat pengunjung menekan play.

## Isi folder

| Berkas | Guna |
| --- | --- |
| `naskah.py` | HTML saat teduh → naskah yang enak dibacakan. Rujukan ayat dieja, label dan instruksi dibuang, angka jadi kata. **Di sini kualitas suara ditentukan.** |
| `buat_audio.py` | Ambil edisi 7 hari terakhir dari DB → TTS → gabung → unggah ke bucket `audio-renungan` → perbarui `manifest.json` → hapus audio kedaluwarsa. |
| `jalan-harian.sh` | Pembungkus untuk cron; menulis `riwayat.log`. |
| `riwayat.log` | Catatan 30 hari terakhir. |

## Perintah

```bash
cd "/home/jo-hans/Hermes Allowed/Website Sate/website"

python3 scripts/audio/buat_audio.py --kering     # hitung saja, tidak menulis
python3 scripts/audio/buat_audio.py              # 7 hari terakhir
python3 scripts/audio/buat_audio.py --hari 3     # rentang lain (ikut hapus > 3 hari)
python3 scripts/audio/buat_audio.py --slug <slug>  # satu edisi saja
python3 scripts/audio/buat_audio.py --paksa      # buat ulang walau isi tidak berubah
python3 scripts/audio/buat_audio.py --tanpa-bersih  # jangan hapus yang kedaluwarsa
```

Uji normalizer saja (mencetak naskah, tanpa TTS):

```bash
python3 scripts/audio/naskah.py 3      # 3 edisi terbaru
```

## Jadwal

**Tidak ada cron terpisah untuk audio.** Pembuatan audio menempel pada alur
penyalinan renungan yang sudah ada (`~/.hermes/profiles/techie/scripts/salin_renungan_awal.sh`,
cron `0 2-7 * * *` → job "Alur Salin Renungan SaTe"): begitu renungan hari itu
tersalin dan terbaca di situs, `pastikan_audio()` langsung dipanggil.

Karena enam putaran 02:00–07:00 memanggil skrip yang sama, skrip **wajib
idempoten** — itu sebabnya ada hash isi: putaran kedua dan seterusnya hanya
melaporkan "dilewati", tidak menyintesis ulang.

Kalau perlu membuat audio tanpa menyalin (mis. audio terhapus, atau edisi lama):

```bash
python3 scripts/audio/buat_audio.py --slug <slug> --tanpa-bersih
```

## Penyimpanan & retensi

- Bucket `audio-renungan` (publik, hanya baca). Berisi `<slug>.mp3` + `manifest.json`.
- Retensi **7 hari**, dihapus oleh `buat_audio.py` setiap kali jalan.
  Yang dihapus adalah **cache audio**, bukan data: teks renungan tetap utuh di
  tabel `devotions`. Kalau audio lama diminta lagi, cukup jalankan ulang dengan
  `--slug`.
- Ukuran: ~1,5 MB per edisi, 7 edisi ≈ 10 MB. Kuota gratis Supabase 1 GB.
- Tidak ada tabel baru di database.

## Suara

`id-ID-ArdiNeural`, tempo **−15%**, mono 24 kHz 48 kbps. Tempo −15% dipilih Jo
karena Ardi terdengar lebih cepat daripada Gadis pada tempo sama. Kalau diganti,
naikkan juga versi di `TEMPO`/`SUARA` **dan** akhiri dengan `--paksa`, karena hash
menyertakan keduanya.

## Batasan yang diketahui

- Edge TTS adalah endpoint konsumen Microsoft — gratis, tapi tanpa jaminan
  layanan. Kalau mati, ganti mesin TTS di `ucap()` (Azure Neural memakai suara
  `id-ID-ArdiNeural` yang sama, berbayar $15/1 jt karakter).
- Audio hanya untuk edisi **published** dalam 7 hari terakhir. Arsip lama tidak
  punya audio kecuali dibuat manual dengan `--slug`.
- Suara AI diumumkan di pemutar ("Suara dibacakan mesin (AI)") supaya pendengar
  tidak mengira pembaca manusia.
