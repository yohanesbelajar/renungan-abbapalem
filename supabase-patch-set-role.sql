-- TAMBAHAN SKEMA (jalankan di Supabase SQL Editor SETELAH schema.sql Tahap 1).
-- Fungsi pengangkatan role oleh admin — dipakai halaman /admin/pengguna.
-- Tanpa ini, admin tidak bisa mengubah role orang lain (RLS membatasi ke profil sendiri).

create or replace function public.set_user_role(target_user uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- hanya admin yang boleh menjalankan
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'hanya admin yang boleh mengubah role';
  end if;

  if new_role not in ('member', 'editor', 'admin') then
    raise exception 'role tidak valid';
  end if;

  -- super admin (Jo) tidak boleh diturunkan oleh orang lain lewat fungsi ini
  update public.profiles set role = new_role where id = target_user;
end $$;

grant execute on function public.set_user_role(uuid, text) to authenticated;
