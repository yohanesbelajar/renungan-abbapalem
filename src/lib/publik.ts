// Data publik yang dipakai halaman tanpa sesi (sitemap, topik, ringkasan
// arsip). Semuanya lewat klien anonim tanpa cookie supaya bisa di-cache
// (unstable_cache + tag "devotions"). Tag itu dipicu ulang oleh
// /api/segar setiap kali admin menyimpan atau cron menerbitkan edisi baru.
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";

const HALAMAN = 1000;
const BATAS = 20000;

export type BarisPublik = {
  slug: string;
  devotion_date: string;
  title: string;
  theme: string | null;
};

export type BarisRingkas = { devotion_date: string; theme: string | null };

type Hasil<T> = { data: T[] | null; error: unknown };

// PostgREST memotong 1.000 baris per permintaan tanpa galat — sambung halaman.
async function ambilSemua<T>(
  bikin: (dari: number, sampai: number) => PromiseLike<Hasil<T>>,
  batas: number
): Promise<T[]> {
  const keluaran: T[] = [];
  for (let dari = 0; dari < batas; dari += HALAMAN) {
    const sampai = Math.min(dari + HALAMAN, batas) - 1;
    let r = await bikin(dari, sampai);
    if (r.error) r = await bikin(dari, sampai);
    if (r.error) break;
    const d = r.data ?? [];
    keluaran.push(...d);
    if (d.length < sampai - dari + 1) break;
  }
  return keluaran;
}

/** Semua edisi terbit, urut tanggal naik — untuk sitemap & daftar topik. */
export const semuaTerbit = unstable_cache(
  async (): Promise<BarisPublik[]> => {
    const db = anonClient();
    return ambilSemua<BarisPublik>(
      (dari, sampai) =>
        db
          .from("devotions")
          .select("slug, devotion_date, title, theme")
          .eq("status", "published")
          .order("devotion_date", { ascending: true })
          .order("slug", { ascending: true })
          .range(dari, sampai),
      BATAS
    );
  },
  ["terbit-semua"],
  { revalidate: 3600, tags: ["devotions"] }
);

/** Hanya tanggal + tema (ringan) — dipakai daftar tahun/bulan/topik. */
export const semuaRingkas = unstable_cache(
  async (): Promise<BarisRingkas[]> => {
    const db = anonClient();
    return ambilSemua<BarisRingkas>(
      (dari, sampai) =>
        db
          .from("devotions")
          .select("devotion_date, theme")
          .eq("status", "published")
          .order("devotion_date", { ascending: false })
          .order("slug", { ascending: true })
          .range(dari, sampai),
      BATAS
    );
  },
  ["ringkas-semua"],
  { revalidate: 1800, tags: ["devotions"] }
);
