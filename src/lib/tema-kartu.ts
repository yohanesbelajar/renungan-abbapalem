// Kartu satu tema, di-cache per tema (tag "devotions").
// Halaman /topik/[slug] dulu memakai klien server ber-cookie, sehingga
// halaman tidak bisa di-cache CDN. Sekarang lewat klien anonim.
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";
import type { DevotionCard } from "./types";

const KOLOM = "slug, devotion_date, title, theme, hearts_count";

export async function kartuTema(tema: string): Promise<DevotionCard[]> {
  return kartuTemaCache(tema);
}

const kartuTemaCache = unstable_cache(
  async (tema: string): Promise<DevotionCard[]> => {
    const { data } = await anonClient()
      .from("devotions")
      .select(KOLOM)
      .eq("status", "published")
      .eq("theme", tema)
      .order("devotion_date", { ascending: false })
      .limit(400);
    return (data as DevotionCard[] | null) ?? [];
  },
  ["kartu-tema"],
  { revalidate: 1800, tags: ["devotions"] }
);
