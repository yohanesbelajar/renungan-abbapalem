-- =============================================================
-- Patch: KELOLA ANGGOTA & KELOLA PENGGUNA
--   (1) admin/pemilik grup bisa MENGELUARKAN anggota dari grupnya
--   (2) admin situs bisa MENENDANG akun (login diblokir, bisa dipulihkan)
--   (3) superadmin bisa MENGHAPUS akun permanen
-- Dibuat: 22 Nov 2026
-- Sifat: menambah kolom + fungsi baru; kebijakan RLS lama tidak dilonggarkan.
-- Jalankan lewat tools-import/jalankan_sql.py
-- =============================================================

-- -------------------------------------------------------------
-- 1. STATUS AKUN pada tabel profiles
--    aktif    = normal
--    ditendang= login diblokir karena dikeluarkan admin situs
--    nonaktif = disisihkan admin (tanpa blokir login)
-- -------------------------------------------------------------
alter table public.profiles
  add column if not exists status text not null default 'aktif';
alter table public.profiles
  add column if not exists status_at timestamptz;
alter table public.profiles
  add column if not exists status_oleh uuid;
alter table public.profiles
  add column if not exists status_alasan text;

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('aktif', 'ditendang', 'nonaktif'));

create index if not exists profiles_status_idx on public.profiles (status);

-- -------------------------------------------------------------
-- 2. Pemeriksa peran pemanggil (SECURITY DEFINER, aman dari RLS)
-- -------------------------------------------------------------
create or replace function public.peran_saya()
returns text
language sql security definer set search_path = public stable
as $$
  select coalesce((select p.role from profiles p where p.id = auth.uid()), '');
$$;

create or replace function public.status_saya()
returns text
language sql security definer set search_path = public stable
as $$
  select coalesce((select p.status from profiles p where p.id = auth.uid()), '');
$$;

revoke all on function public.peran_saya() from public, anon;
grant execute on function public.peran_saya() to authenticated;
revoke all on function public.status_saya() from public, anon;
grant execute on function public.status_saya() to authenticated;

-- -------------------------------------------------------------
-- 3. Catatan aktivitas: jenis baru
-- -------------------------------------------------------------
alter table public.aktivitas drop constraint if exists aktivitas_jenis_check;
alter table public.aktivitas
  add constraint aktivitas_jenis_check
  check (jenis in ('daftar', 'buat_grup', 'gabung_grup', 'keluar_grup',
                   'ubah_nama', 'baca',
                   'tendang_anggota', 'tendang_akun', 'pulihkan_akun',
                   'hapus_akun'));

-- -------------------------------------------------------------
-- 4. KELUARKAN ANGGOTA DARI GRUP
--    owner  -> boleh mengeluarkan admin & anggota
--    admin  -> hanya boleh mengeluarkan anggota biasa
--    pemilik tidak bisa dikeluarkan; tidak bisa mengeluarkan diri sendiri
-- -------------------------------------------------------------
create or replace function public.keluarkan_anggota(p_grup uuid, p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_saya   text;
  v_target text;
  v_nama   text;
begin
  if auth.uid() is null then
    raise exception 'harus masuk lebih dulu';
  end if;
  if p_user = auth.uid() then
    raise exception 'tidak bisa mengeluarkan diri sendiri — pakai tombol Keluar dari grup';
  end if;
  if public.status_saya() <> 'aktif' then
    raise exception 'akun Anda tidak aktif';
  end if;

  v_saya := public.peran_grup(p_grup);
  if v_saya not in ('owner', 'admin') then
    raise exception 'hanya pemilik atau admin grup yang boleh mengeluarkan anggota';
  end if;

  v_target := public.peran_grup(p_grup, p_user);
  if v_target is null then
    raise exception 'orang ini bukan anggota grup';
  end if;
  if v_target = 'owner' then
    raise exception 'pemilik grup tidak bisa dikeluarkan';
  end if;
  if v_target = 'admin' and v_saya <> 'owner' then
    raise exception 'hanya pemilik grup yang boleh mengeluarkan admin';
  end if;

  select coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''), 'anggota')
    into v_nama from profiles p where p.id = p_user;

  delete from community_members
   where community_id = p_grup and user_id = p_user;

  insert into aktivitas (jenis, user_id, grup_id, keterangan)
  values ('tendang_anggota', p_user, p_grup, coalesce(v_nama, 'anggota'));
end $$;

revoke all on function public.keluarkan_anggota(uuid, uuid) from public, anon;
grant execute on function public.keluarkan_anggota(uuid, uuid) to authenticated;

-- -------------------------------------------------------------
-- 5. JAGA: perubahan status hanya lewat fungsi di bawah
--    (mencegah pengguna menembus lewat update profil sendiri)
-- -------------------------------------------------------------
create or replace function public.jaga_status_profil()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.ubah_status', true), '') <> 'ya'
     and public.peran_saya() not in ('admin', 'superadmin') then
    raise exception 'status akun hanya bisa diubah admin';
  end if;
  return new;
end $$;

drop trigger if exists jaga_status_profil on public.profiles;
create trigger jaga_status_profil
  before update on public.profiles
  for each row execute function public.jaga_status_profil();

-- -------------------------------------------------------------
-- 6. TENDANG AKUN (login diblokir + sesi diputus, data tetap utuh)
-- -------------------------------------------------------------
create or replace function public.tendang_pengguna(p_user uuid, p_alasan text default null)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_saya   text;
  v_target text;
  v_nama   text;
begin
  v_saya := public.peran_saya();
  if v_saya not in ('admin', 'superadmin') then
    raise exception 'hanya admin situs yang boleh menendang akun';
  end if;
  if p_user = auth.uid() then
    raise exception 'tidak bisa menendang akun sendiri';
  end if;

  select p.role,
         coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''), p.email)
    into v_target, v_nama
    from profiles p where p.id = p_user;
  if v_target is null then
    raise exception 'akun tidak ditemukan';
  end if;
  if v_target = 'superadmin' then
    raise exception 'akun super admin tidak bisa ditendang';
  end if;
  if v_target = 'admin' and v_saya <> 'superadmin' then
    raise exception 'hanya super admin yang boleh menendang admin lain';
  end if;

  perform set_config('app.ubah_status', 'ya', true);

  update profiles
     set status = 'ditendang',
         status_at = now(),
         status_oleh = auth.uid(),
         status_alasan = nullif(btrim(p_alasan), '')
   where id = p_user;

  -- Blokir login lewat GoTrue: banned_until di masa depan = akun terkunci.
  update auth.users
     set banned_until = now() + interval '100 years'
   where id = p_user;

  -- Putus sesi yang sedang berjalan: token penyegar dihapus, token akses
  -- yang beredar mati sendiri dalam waktu singkat.
  delete from auth.refresh_tokens where user_id = p_user::text;
  delete from auth.sessions where user_id = p_user;

  insert into aktivitas (jenis, user_id, keterangan)
  values ('tendang_akun', p_user, coalesce(v_nama, 'akun'));
end $$;

revoke all on function public.tendang_pengguna(uuid, text) from public, anon;
grant execute on function public.tendang_pengguna(uuid, text) to authenticated;

-- -------------------------------------------------------------
-- 7. PULIHKAN AKUN (kebalikan tendang)
-- -------------------------------------------------------------
create or replace function public.pulihkan_pengguna(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_nama text;
begin
  if public.peran_saya() not in ('admin', 'superadmin') then
    raise exception 'hanya admin situs yang boleh memulihkan akun';
  end if;

  select coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''), p.email)
    into v_nama from profiles p where p.id = p_user;
  if v_nama is null then
    raise exception 'akun tidak ditemukan';
  end if;

  perform set_config('app.ubah_status', 'ya', true);

  update profiles
     set status = 'aktif', status_at = now(), status_oleh = auth.uid(), status_alasan = null
   where id = p_user;

  update auth.users set banned_until = null where id = p_user;

  insert into aktivitas (jenis, user_id, keterangan)
  values ('pulihkan_akun', p_user, coalesce(v_nama, 'akun'));
end $$;

revoke all on function public.pulihkan_pengguna(uuid) from public, anon;
grant execute on function public.pulihkan_pengguna(uuid) to authenticated;

-- -------------------------------------------------------------
-- 8. HAPUS AKUN PERMANEN (superadmin saja)
--    Ditolak bila: diri sendiri, superadmin, masih pemilik grup yang
--    beranggota lain, atau pernah menulis saat teduh.
--    Penghapusan auth.users mengalir berantai ke profiles, keanggotaan
--    grup, favorit, dan progres bacaan (ON DELETE CASCADE).
-- -------------------------------------------------------------
create or replace function public.hapus_pengguna(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_target text;
  v_nama   text;
  v_grup   text;
  v_tulis  bigint;
begin
  if public.peran_saya() <> 'superadmin' then
    raise exception 'hanya super admin yang boleh menghapus akun permanen';
  end if;
  if p_user = auth.uid() then
    raise exception 'tidak bisa menghapus akun sendiri';
  end if;

  select p.role,
         coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''), p.email)
    into v_target, v_nama
    from profiles p where p.id = p_user;
  if v_target is null then
    raise exception 'akun tidak ditemukan';
  end if;
  if v_target = 'superadmin' then
    raise exception 'akun super admin tidak bisa dihapus';
  end if;

  select c.name into v_grup
    from communities c
    join community_members m
      on m.community_id = c.id and m.user_id = p_user and m.role = 'owner'
   where (select count(*) from community_members m2 where m2.community_id = c.id) > 1
   limit 1;
  if v_grup is not null then
    raise exception 'akun ini masih pemilik grup "%" — pindahkan kepemilikan dulu', v_grup;
  end if;

  select count(*) into v_tulis from devotions where created_by = p_user;
  if v_tulis > 0 then
    raise exception 'akun ini tercatat sebagai penulis % saat teduh — tidak bisa dihapus', v_tulis;
  end if;

  insert into aktivitas (jenis, user_id, keterangan)
  values ('hapus_akun', p_user, coalesce(v_nama, 'akun'));

  delete from auth.users where id = p_user;
  if not found then
    raise exception 'akun tidak ditemukan di daftar autentikasi';
  end if;
end $$;

revoke all on function public.hapus_pengguna(uuid) from public, anon;
grant execute on function public.hapus_pengguna(uuid) to authenticated;

-- -------------------------------------------------------------
-- 9. Gabung grup ditolak untuk akun yang tidak aktif
-- -------------------------------------------------------------
create or replace function public.join_community(p_kode text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  if public.status_saya() <> 'aktif' then
    raise exception 'akun Anda tidak aktif';
  end if;
  select id into v_id from communities
   where invite_code = upper(btrim(coalesce(p_kode, '')));
  if v_id is null then
    return null;
  end if;
  insert into community_members (community_id, user_id, role)
  values (v_id, auth.uid(), 'member')
  on conflict do nothing;
  return v_id;
end $$;

revoke all on function public.join_community(text) from public, anon;
grant execute on function public.join_community(text) to authenticated;

-- -------------------------------------------------------------
-- 10. Daftar pengguna untuk panel admin (termasuk yang sudah ditendang)
-- -------------------------------------------------------------
drop function if exists public.daftar_pengguna();
create function public.daftar_pengguna()
returns table (
  id           uuid,
  nama         text,
  email        text,
  peran        text,
  status       text,
  status_at    timestamptz,
  alasan       text,
  dibuat       timestamptz,
  jumlah_grup  bigint
)
language plpgsql security definer set search_path = public
as $$
begin
  if public.peran_saya() not in ('admin', 'superadmin') then
    raise exception 'hanya admin situs yang boleh melihat daftar pengguna';
  end if;
  return query
  select p.id,
         coalesce(nullif(btrim(p.username), ''), nullif(btrim(p.display_name), ''), '-'),
         p.email,
         p.role,
         p.status,
         p.status_at,
         p.status_alasan,
         p.created_at,
         (select count(*) from community_members m where m.user_id = p.id)
  from profiles p
  order by (p.status = 'ditendang'), p.created_at;
end $$;

revoke all on function public.daftar_pengguna() from public, anon;
grant execute on function public.daftar_pengguna() to authenticated;
