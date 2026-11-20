// Data satu edisi + tetangga + terkait, di-cache per slug (tag "devotions").
// Halaman edisi tetap dinamis karena memuat status heart/selesai milik
// pengunjung yang login — yang di-cache hanya bagian yang sama untuk semua
// orang, sehingga empat kueri Supabase per kunjungan menjadi nol.
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";
import type { DevotionCard } from "./types";

export type Edisi = {
  id: string;
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  body: string;
  theme: string | null;
  hearts_count: number;
};

export type EdisiLengkap = {
  d: Edisi;
  prev: DevotionCard | null;
  next: DevotionCard | null;
  related: DevotionCard[];
};

const KARTU = "slug, title, devotion_date, theme, hearts_count";

// Cache dibuat tingkat modul (bukan per panggilan) supaya entri benar-benar
// dipakai ulang antar permintaan — lihat catatan di lib/arsip.ts.
const edisiCache = unstable_cache(
  async (slug: string) => {
    const db = anonClient();
    const { data: d } = await db
      .from("devotions")
      .select("id, slug, devotion_date, title, summary, body, theme, hearts_count")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    if (!d) return null;

    const [prevR, nextR, relatedR] = await Promise.all([
      db
        .from("devotions")
        .select(KARTU)
        .eq("status", "published")
        .lt("devotion_date", d.devotion_date)
        .order("devotion_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from("devotions")
        .select(KARTU)
        .eq("status", "published")
        .gt("devotion_date", d.devotion_date)
        .order("devotion_date")
        .limit(1)
        .maybeSingle(),
      d.theme
        ? db
            .from("devotions")
            .select(KARTU)
            .eq("status", "published")
            .eq("theme", d.theme)
            .neq("id", d.id)
            .order("devotion_date", { ascending: false })
            .limit(3)
        : Promise.resolve({ data: [] as DevotionCard[] }),
    ]);

    return {
      d: d as Edisi,
      prev: (prevR.data as DevotionCard | null) ?? null,
      next: (nextR.data as DevotionCard | null) ?? null,
      related: (relatedR.data as DevotionCard[] | null) ?? [],
    };
  },
  ["edisi"],
  { revalidate: 300, tags: ["devotions"] }
);

export async function edisiLengkap(slug: string): Promise<EdisiLengkap | null> {
  return edisiCache(slug);
}
