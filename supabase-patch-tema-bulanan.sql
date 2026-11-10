-- TEMA BULANAN + PENULIS TERSEMBUNYI (11 Nov 2026)
-- Dipakai halaman "Tulis Saat Teduh Baru":
--  * tema diinput sekali per bulan, diubah = berubah untuk seluruh bulan itu
--  * nama penulis hanya bisa dibaca admin/editor (tabel terpisah + RLS)

-- ---------- 1) Tema per bulan ----------
create table if not exists public.themes (
  bulan text primary key check (bulan ~ '^[0-9]{4}-[0-9]{2}$'),
  tema text,
  updated_at timestamptz not null default now()
);

alter table public.themes enable row level security;

drop policy if exists "tema_baca_staf" on public.themes;
drop policy if exists "tema_tulis_staf" on public.themes;

create policy "tema_baca_staf" on public.themes
  for select using (public.current_role_is_staff());

create policy "tema_tulis_staf" on public.themes
  for all using (public.current_role_is_staff())
  with check (public.current_role_is_staff());

-- Isi awal dari tema yang sudah ada di baris devotions (tema terbanyak per bulan)
insert into public.themes (bulan, tema)
select to_char(devotion_date, 'YYYY-MM') as bulan,
       mode() within group (order by theme) as tema
  from public.devotions
 where theme is not null and btrim(theme) <> ''
   and devotion_date < date '2099-01-01'
 group by 1
on conflict (bulan) do nothing;

-- Ubah tema sebulan sekaligus (atomik): baris tema + semua devotions bulan itu
create or replace function public.set_theme_bulan(p_bulan text, p_tema text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tema text := nullif(btrim(coalesce(p_tema, '')), '');
begin
  if not public.current_role_is_staff() then
    raise exception 'hanya admin/editor yang boleh mengubah tema';
  end if;
  if p_bulan !~ '^[0-9]{4}-[0-9]{2}$' then
    raise exception 'bulan tidak valid';
  end if;

  insert into public.themes (bulan, tema, updated_at)
  values (p_bulan, v_tema, now())
  on conflict (bulan) do update set tema = excluded.tema, updated_at = now();

  update public.devotions
     set theme = v_tema,
         updated_at = now()
   where devotion_date >= (p_bulan || '-01')::date
     and devotion_date <  ((p_bulan || '-01')::date + interval '1 month');
end $$;

grant execute on function public.set_theme_bulan(text, text) to authenticated;

-- ---------- 2) Nama penulis (khusus staf) ----------
create table if not exists public.devotion_authors (
  devotion_id uuid primary key references public.devotions(id) on delete cascade,
  nama text not null,
  updated_at timestamptz not null default now()
);

alter table public.devotion_authors enable row level security;

drop policy if exists "penulis_baca_staf" on public.devotion_authors;
drop policy if exists "penulis_tulis_staf" on public.devotion_authors;

create policy "penulis_baca_staf" on public.devotion_authors
  for select using (public.current_role_is_staff());

create policy "penulis_tulis_staf" on public.devotion_authors
  for all using (public.current_role_is_staff())
  with check (public.current_role_is_staff());

-- Pindahkan penulis lama (kolom devotions.author) ke tabel baru, lalu kosongkan
insert into public.devotion_authors (devotion_id, nama)
select id, btrim(author) from public.devotions
 where author is not null and btrim(author) <> ''
on conflict (devotion_id) do nothing;

-- ---------- Catatan ----------
-- Kolom lama public.devotions.author: tidak bisa disembunyikan lewat REVOKE
-- kolom (SELECT di tingkat tabel tetap menutupinya), dan isinya sekarang
-- selalu NULL karena penulis baru masuk ke public.devotion_authors.
-- Jangan diisi lagi. anon tidak membaca apa pun di devotion_authors.
