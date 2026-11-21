-- =============================================================
-- Patch: fitur KOMUNITAS (grup) — Abbalove Palem: Saat Teduh
-- Dibuat: 21 Nov 2026 (cabang fitur-grup)
-- Sifat: HANYA menambah tabel/fungsi/trigger/policy BARU.
--        Tabel devotions, profiles, favorites, reading_progress
--        TIDAK diubah sama sekali (policy lama tetap berlaku).
-- Jalankan lewat SQL Editor Supabase atau jalankan_sql.py.
-- =============================================================

-- 1. TABEL GRUP ------------------------------------------------
create table if not exists public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  invite_code text not null unique
              default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists community_members_user_idx
  on public.community_members (user_id);

-- 2. RLS: hanya anggota yang saling terlihat -------------------
alter table public.communities enable row level security;
alter table public.community_members enable row level security;

-- Pemeriksa keanggotaan: SECURITY supaya kebijakan tidak membaca tabel
-- yang sama dengan dirinya (rekursi tak hingga / error 42P17).
create or replace function public.anggota_grup(p_grup uuid, p_user uuid default auth.uid())
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from community_members m
    where m.community_id = p_grup and m.user_id = p_user);
$$;

drop policy if exists "grup_lihat_anggota" on public.communities;
create policy "grup_lihat_anggota" on public.communities
  for select using (public.anggota_grup(id) or created_by = auth.uid());

drop policy if exists "grup_buat" on public.communities;
create policy "grup_buat" on public.communities
  for insert with check (created_by = auth.uid());

drop policy if exists "grup_ubah_pemilik" on public.communities;
create policy "grup_ubah_pemilik" on public.communities
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());
-- Tidak ada policy delete: grup hanya hilang otomatis saat anggota terakhir keluar.

drop policy if exists "anggota_lihat" on public.community_members;
create policy "anggota_lihat" on public.community_members
  for select using (public.anggota_grup(community_members.community_id));

drop policy if exists "anggota_keluar" on public.community_members;
create policy "anggota_keluar" on public.community_members
  for delete using (user_id = auth.uid());
-- Tidak ada policy insert: keanggotaan hanya lewat fungsi join_community / trigger.

-- 3. FUNGSI: bergabung lewat kode undangan ---------------------
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

-- 4. FUNGSI: progres seluruh anggota grup yang ikut saya -------
--    (security definer: membaca reading_progress milik orang lain
--     TANPA melonggarkan policy progres_sendiri yang lama)
create or replace function public.komunitas_progres()
returns table (
  grup_id     uuid,
  grup_nama   text,
  kode_undang text,
  user_id     uuid,
  nama        text,
  peran       text,
  bergabung   timestamptz,
  hari_ini    boolean,
  total_selesai bigint
)
language sql security definer set search_path = public
as $$
  select m.community_id,
         c.name,
         c.invite_code,
         m.user_id,
         coalesce(nullif(btrim(p.display_name), ''), split_part(p.email, '@', 1)),
         m.role,
         m.joined_at,
         exists (
           select 1 from reading_progress rp
           join devotions d on d.id = rp.devotion_id
           where rp.user_id = m.user_id
             and d.devotion_date = (now() at time zone 'Asia/Jakarta')::date
             and d.status = 'published'),
         (select count(*) from reading_progress rp2 where rp2.user_id = m.user_id)
  from community_members m
  join communities c on c.id = m.community_id
  join profiles p on p.id = m.user_id
  where exists (
    select 1 from community_members me
    where me.community_id = m.community_id and me.user_id = auth.uid())
  order by c.name, m.joined_at;
$$;

-- 5. TRIGGER: pemilik otomatis saat grup dibuat ----------------
create or replace function public.grup_pemilik_otomatis()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into community_members (community_id, user_id, role)
  values (new.id, new.created_by, 'owner')
  on conflict do nothing;
  return new;
end $$;

drop trigger if exists grup_pemilik_setelah on public.communities;
create trigger grup_pemilik_setelah
after insert on public.communities
for each row execute function public.grup_pemilik_otomatis();

-- 6. TRIGGER: pemilik keluar → anggota terlama jadi pemilik;
--    anggota terakhir keluar → grup ikut terhapus
create or replace function public.grup_setelah_keluar()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  v_penerus uuid;
begin
  if old.role <> 'owner' then
    return null;
  end if;
  select user_id into v_penerus from community_members
   where community_id = old.community_id
   order by joined_at asc, user_id asc
   limit 1;
  if v_penerus is not null then
    update community_members set role = 'owner'
     where community_id = old.community_id and user_id = v_penerus;
  else
    delete from communities where id = old.community_id;
  end if;
  return null;
end $$;

drop trigger if exists anggota_keluar_setelah on public.community_members;
create trigger anggota_keluar_setelah
after delete on public.community_members
for each row execute function public.grup_setelah_keluar();

-- 7. IZIN PANGGILAN: hanya akun login, bukan pengunjung anonim
revoke all on function public.join_community(text) from public, anon;
grant execute on function public.join_community(text) to authenticated;

revoke all on function public.komunitas_progres() from public, anon;
grant execute on function public.komunitas_progres() to authenticated;

revoke all on function public.anggota_grup(uuid, uuid) from public, anon;
grant execute on function public.anggota_grup(uuid, uuid) to authenticated;
