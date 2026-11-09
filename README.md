# Abbalove Palem — Saat Teduh

Website saat teduh harian Abbalove Palem (bagian dari keluarga besar Abbalove
Ministries). Dibangun sesuai PRD dan Rencana Tahap 1 — jangan ubah aturan
identitas tanpa persetujuan Jo.

- Nama yang dipakai: **Abbalove Palem — Saat Teduh** (jangan pernah
  "Abbalove Taman Palem").
- Kredit kutipan wajib: **"Dikutip dari ALKITAB (TB) © LAI 1974"** — sudah
  otomatis di bawah setiap kutipan dan di footer.

## Teknologi

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4, komponen sendiri
- Supabase (PostgreSQL + Auth) — skema: `../Tahap 1 Perencanaan/schema.sql`
  lalu patch `supabase-patch-set-role.sql`
- Vercel (hosting) + Vercel Cron tiap menit untuk penerbitan terjadwal

## Pemasangan (urut)

1. **Supabase** — buat project baru (urusan Jo), lalu di SQL Editor jalankan:
   1. `../Tahap 1 Perencanaan/schema.sql` (persis apa adanya)
   2. `supabase-patch-set-role.sql` (fungsi pengangkatan role oleh admin)
2. **Auth Supabase** — aktifkan login email+password. Email verifikasi:
   pakai layanan bawaan Supabase; bila kuota mentok, berhenti dan lapor ke Jo —
   jangan ganti layanan sendiri.
   Redirect URL: tambahkan `https://DOMAIN-ANDA/auth/callback`.
3. **`.env.local`** — isi 4 nilai:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...   # Settings → API, RAHASIA
   CRON_SECRET=...                 # buat sendiri, acak panjang
   ```
4. **Jadikan Jo super admin** — setelah Jo mendaftar lewat website:
   ```sql
   update public.profiles set role = 'admin' where email = 'email-jo';
   ```
5. **Vercel** — hubungkan repo GitHub (akun Jo), set env yang sama.
   Cron sudah dikonfigurasi di `vercel.json` (tiap menit).
6. **Uji** — pastikan kriteria di `../Tahap 1 Perencanaan/laporan-tahap1.md` §7 lulus.

## Struktur

```
src/app/            halaman (App Router)
  page.tsx          beranda
  saat teduh/[slug]/  halaman baca
  arsip/ tentang/ masuk/ daftar/ profil/
  admin/            dashboard, saat teduh, statistik, pengguna
  auth/callback/    callback verifikasi/reset Supabase
  api/publish-scheduled/  cron penerbitan terjadwal
src/components/     Header, Footer, kartu saat teduh, aksi heart/selesai, form admin
src/lib/            klien Supabase (client/server/service), konstanta, tanggal
middleware.ts       refresh sesi Supabase
```

## Aturan penting

- Satu tanggal satu saat teduh — `devotion_date` unik di basis data.
- Heart & penanda selesai: kunci ganda (user+saat teduh) — ganda mustahil.
- RLS aktif di semua tabel (lihat schema.sql) — jangan dilonggarkan.
- Role admin/editor hanya lewat dashboard admin (RPC `set_user_role`),
  tidak ada lewat pendaftaran.
- "Lanjutkan dengan Google" ditunda sampai domain terpasang (izin Jo).
