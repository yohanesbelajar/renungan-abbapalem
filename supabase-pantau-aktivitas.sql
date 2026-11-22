-- =============================================================
-- Pantau lintas grup (khusus superadmin) + catatan aktivitas
-- Dibuat: 22 Nov 2026 (permintaan Jo: halaman pantau grup + B1)
-- Sifat: HANYA menambah fungsi/tabel/trigger/policy BARU.
--        komunitas_progres() dan seluruh kebijakan lama TIDAK diubah.
-- Jalankan lewat jalankan_sql.py / SQL Editor Supabase.
-- =============================================================

-- 1. Pemeriksa pengawas: benar-benar hanya akun superadmin (Jo) -------
create or replace function public.is_pengawas()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'superadmin');
$$;

revoke all on function public.is_pengawas() from public;
grant execute on function public.is_pengawas() to authenticated, anon;
-- anon ikut diberi izin karena kebijakan baca tabel aktivitas memanggil
-- fungsi ini; hasilnya tetap false untuk pengunjung tanpa akun.

-- 2. Progres SELURUH grup — hanya untuk pengawas --------------------
--    Bentuk kolom sama dengan komunitas_progres(); syarat "grup tempat
--    saya ikut" diganti is_pengawas(), sehingga pengawas tidak perlu
--    menjadi anggota grup mana pun. Bukan pengawas → nol baris.
drop function if exists public.pengawas_progres();
create function public.pengawas_progres()
returns table (
  grup_id     uuid,
  grup_nama   text,
  kode_undang text,
  user_id     uuid,
  nama        text,
  peran       text,
  bergabung   timestamptz,
  hari_ini    boolean,
  total_selesai bigint,
  streak      bigint,
  minggu      boolean[]
)
language sql security definer set search_path = public
as $$
  select m.community_id,
         c.name,
         c.invite_code,
         m.user_id,
         coalesce(nullif(btrim(p.username), ''),
                  nullif(btrim(p.display_name), ''),
                  'Anggota'),
         m.role,
         m.joined_at,
         exists (
           select 1 from reading_progress rp
           join devotions d on d.id = rp.devotion_id
           where rp.user_id = m.user_id
             and d.devotion_date = (now() at time zone 'Asia/Jakarta')::date
             and d.status = 'published'),
         (select count(*) from reading_progress rp2 where rp2.user_id = m.user_id),
         st.streak,
         mg.minggu
  from community_members m
  join communities c on c.id = m.community_id
  join profiles p on p.id = m.user_id
  cross join lateral (
    select coalesce(min(g), 367) as streak
    from generate_series(0, 366) g
    where not exists (
      select 1
      from reading_progress rp
      join devotions d on d.id = rp.devotion_id
      where rp.user_id = m.user_id
        and d.devotion_date = (now() at time zone 'Asia/Jakarta')::date - g
    )
  ) st
  cross join lateral (
    select ((now() at time zone 'Asia/Jakarta')::date
            - (extract(dow from (now() at time zone 'Asia/Jakarta')::date))::int) as awal
  ) wk
  cross join lateral (
    select array_agg(
             exists (
               select 1 from reading_progress rp
               join devotions d on d.id = rp.devotion_id
               where rp.user_id = m.user_id
                 and d.devotion_date = wk.awal + g
                 and d.status = 'published')
             order by g) as minggu
    from generate_series(0, 6) g
  ) mg
  where public.is_pengawas()
  order by c.name, m.joined_at;
$$;

revoke all on function public.pengawas_progres() from public, anon;
grant execute on function public.pengawas_progres() to authenticated;

-- 3. TABEL CATATAN AKTIVITAS (B1) -----------------------------------
--    Pendaftaran, buat/gabung/keluar grup, ganti nama, baca renungan.
--    Ditulis oleh TRIGGER (bukan klien) — tidak ada policy insert,
--    baca hanya oleh pengawas.
--    user_id & grup_id TANPA foreign key: akun uji boleh dihapus dan
--    grup bisa terhapus berantai tanpa menggagalkan pencatatan/hapus.
create table if not exists public.aktivitas (
  id         uuid primary key default gen_random_uuid(),
  terjadi_at timestamptz not null default now(),
  jenis      text not null check (jenis in
             ('daftar', 'buat_grup', 'gabung_grup', 'keluar_grup',
              'ubah_nama', 'baca')),
  user_id    uuid,
  grup_id    uuid,
  keterangan text
);

create index if not exists aktivitas_terjadi_idx
  on public.aktivitas (terjadi_at desc);

alter table public.aktivitas enable row level security;

drop policy if exists "aktivitas_hanya_pengawas" on public.aktivitas;
create policy "aktivitas_hanya_pengawas" on public.aktivitas
  for select using (public.is_pengawas());

-- Klien tidak boleh menulis sama sekali (pencatatan lewat trigger).
revoke insert, update, delete on public.aktivitas from anon, authenticated;

-- 4. PENCATAT OTOMATIS (trigger SECURITY DEFINER) --------------------
-- 4a. profil: pendaftaran + ganti nama
create or replace function public.aktivitas_profil()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into aktivitas (jenis, user_id, keterangan)
    values ('daftar', new.id, coalesce(new.email, 'akun baru'));
  elsif (new.username is distinct from old.username)
     or (new.display_name is distinct from old.display_name) then
    insert into aktivitas (jenis, user_id, keterangan)
    values ('ubah_nama', new.id,
            coalesce(nullif(btrim(new.username), ''),
                     nullif(btrim(new.display_name), ''), '-'));
  end if;
  return new;
end $$;

drop trigger if exists aktivitas_profil_setelah on public.profiles;
create trigger aktivitas_profil_setelah
after insert or update of username, display_name on public.profiles
for each row execute function public.aktivitas_profil();

-- 4b. grup baru dibuat
create or replace function public.aktivitas_grup_baru()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into aktivitas (jenis, user_id, grup_id, keterangan)
  values ('buat_grup', new.created_by, new.id, new.name);
  return new;
end $$;

drop trigger if exists aktivitas_grup_setelah on public.communities;
create trigger aktivitas_grup_setelah
after insert on public.communities
for each row execute function public.aktivitas_grup_baru();

-- 4c. anggota bergabung / keluar
--     Saat anggota terakhir keluar, grup ikut terhapus oleh trigger lama;
--     pencatatan tetap aman karena grup_id tanpa foreign key.
create or replace function public.aktivitas_anggota()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into aktivitas (jenis, user_id, grup_id, keterangan)
    values ('gabung_grup', new.user_id, new.community_id,
            case when new.role = 'owner'
                 then 'menjadi pemilik' else 'bergabung' end);
  else
    insert into aktivitas (jenis, user_id, grup_id, keterangan)
    values ('keluar_grup', old.user_id, old.community_id, 'keluar');
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists aktivitas_anggota_setelah on public.community_members;
create trigger aktivitas_anggota_setelah
after insert or delete on public.community_members
for each row execute function public.aktivitas_anggota();

-- 4d. renungan dibaca (baris baru di reading_progress)
create or replace function public.aktivitas_baca()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_judul text;
begin
  select d.title into v_judul from devotions d where d.id = new.devotion_id;
  insert into aktivitas (jenis, user_id, keterangan)
  values ('baca', new.user_id, coalesce(v_judul, 'saat teduh'));
  return new;
end $$;

drop trigger if exists aktivitas_baca_setelah on public.reading_progress;
create trigger aktivitas_baca_setelah
after insert on public.reading_progress
for each row execute function public.aktivitas_baca();
