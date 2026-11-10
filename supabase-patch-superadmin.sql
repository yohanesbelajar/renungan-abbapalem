-- PERAN SUPER ADMIN (10 Nov 2026) — jalankan di Supabase SQL Editor.
-- Efek: Yohanes.belajar@gmail.com jadi "superman" — akses penuh, tidak bisa
-- diturunkan bahkan oleh admin lain, dan hanya dia yang bisa mengangkat super admin.
-- Urutan penting: angkat Jo dulu, baru pasang trigger penjaga — SQL Editor
-- dashboard berjalan tanpa auth.uid() (bukan sesi Jo), jadi trigger akan menolak.

-- 0) Kolom role: longgarkan CHECK lama (member/editor/admin) agar muat superadmin.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('member', 'editor', 'admin', 'superadmin'));

-- 1) Fungsi pembaca peran: super admin dihitung admin + staf.
create or replace function public.current_role_is_staff()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select p.role in ('admin', 'editor', 'superadmin')
       from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select p.role in ('admin', 'superadmin')
       from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_is_super()
returns boolean
language sql security definer set search_path = public stable
as $$
  select coalesce(
    (select p.role = 'superadmin'
       from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_role_is_staff() to authenticated, anon;
grant execute on function public.current_user_is_admin() to authenticated, anon;
grant execute on function public.current_user_is_super() to authenticated, anon;

-- 2) Pengangkatan role: aturan super admin.
create or replace function public.set_user_role(target_user uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'hanya admin yang boleh mengubah role';
  end if;
  if new_role not in ('member', 'editor', 'admin', 'superadmin') then
    raise exception 'role tidak valid';
  end if;
  if new_role = 'superadmin' and not public.current_user_is_super() then
    raise exception 'hanya super admin yang boleh mengangkat super admin';
  end if;
  if exists (
       select 1 from public.profiles
       where id = target_user and role = 'superadmin'
     )
     and not public.current_user_is_super() then
    raise exception 'akun super admin tidak bisa diubah oleh admin lain';
  end if;
  update public.profiles set role = new_role where id = target_user;
end $$;

grant execute on function public.set_user_role(uuid, text) to authenticated;

-- 3) Angkat akun Jo menjadi super admin (sebelum trigger dipasang).
update public.profiles
   set role = 'superadmin'
 where lower(email) = 'yohanes.belajar@gmail.com';

-- 4) Penjaga baris: menutup jalan pintas lewat update/insert langsung ke tabel
--    profiles (RLS mengizinkan user menyunting barisnya sendiri).
create or replace function public.jaga_superadmin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.role = 'superadmin' and not public.current_user_is_super() then
      raise exception 'tidak boleh mendaftar sebagai super admin';
    end if;
    return new;
  end if;
  if old.role = 'superadmin' and new.role is distinct from old.role
     and not public.current_user_is_super() then
    raise exception 'akun super admin tidak bisa diturunkan';
  end if;
  if new.role = 'superadmin' and old.role <> 'superadmin'
     and not public.current_user_is_super() then
    raise exception 'hanya super admin yang bisa mengangkat super admin';
  end if;
  return new;
end $$;

drop trigger if exists jaga_superadmin on public.profiles;
create trigger jaga_superadmin
  before insert or update on public.profiles
  for each row execute function public.jaga_superadmin();
