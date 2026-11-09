-- PERBAIKAN: hentikan rekursi tak terbatas pada policy RLS.
-- Masalah: policy "profil_lihat_sendiri" memakai subquery ke public.profiles
-- di dalam policy tabel profiles itu sendiri -> Postgres error 42P17.
-- Policy devotions juga query profiles, jadi ikut gagal.
-- Solusi: fungsi security definer yang membaca role tanpa memicu RLS.

create or replace function public.current_role_is_staff()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.role in ('admin', 'editor') from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_role_is_staff() to authenticated, anon;
grant execute on function public.current_user_is_admin() to authenticated, anon;

-- PROFILES
drop policy if exists "profil_lihat_sendiri" on public.profiles;
create policy "profil_lihat_sendiri" on public.profiles
  for select using (auth.uid() = id or public.current_role_is_staff());

drop policy if exists "profil_ubah_sendiri" on public.profiles;
create policy "profil_ubah_sendiri" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profil_insert_publik" on public.profiles;
create policy "profil_insert_publik" on public.profiles
  for insert with check (auth.uid() = id);

-- DEVOTIONS
drop policy if exists "renungan_baca_publik" on public.devotions;
create policy "renungan_baca_publik" on public.devotions
  for select using (status = 'published' or public.current_role_is_staff());

drop policy if exists "renungan_tulis_staf" on public.devotions;
create policy "renungan_tulis_staf" on public.devotions
  for insert with check (public.current_role_is_staff());

drop policy if exists "renungan_ubah_staf" on public.devotions;
create policy "renungan_ubah_staf" on public.devotions
  for update using (public.current_role_is_staff());

drop policy if exists "renungan_hapus_admin" on public.devotions;
create policy "renungan_hapus_admin" on public.devotions
  for delete using (public.current_user_is_admin());

-- set_user_role: pakai fungsi baru agar konsisten
create or replace function public.set_user_role(target_user uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'hanya admin yang boleh mengubah role';
  end if;
  if new_role not in ('member', 'editor', 'admin') then
    raise exception 'role tidak valid';
  end if;
  update public.profiles set role = new_role where id = target_user;
end $$;

grant execute on function public.set_user_role(uuid, text) to authenticated;
