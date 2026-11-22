// Data beranda — edisi hari ini + beberapa edisi terakhir. Di-cache per
// tanggal Jakarta; dulu setiap kunjungan beranda menembak Supabase tiga kali
// (TTFB terukur 1,24 s).
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";
import type { DevotionCard } from "./types";

// body ikut diambil: beranda menampilkan beberapa kalimat pembuka edisi terbaru.
const KOLOM = "slug, devotion_date, title, theme, hearts_count, body";

export type DataBeranda = {
  hariIni: DevotionCard | null;
  terbaru: DevotionCard | null;
  arsip: DevotionCard[];
};

export const dataBeranda = unstable_cache(
  async (hari: string): Promise<DataBeranda> => {
    const db = anonClient();
    const { data: hariIni } = await db
      .from("devotions")
      .select(KOLOM)
      .eq("status", "published")
      .eq("devotion_date", hari)
      .maybeSingle();

    const { data: arsip } = await db
      .from("devotions")
      .select(KOLOM)
      .eq("status", "published")
      .neq("devotion_date", hari)
      .order("devotion_date", { ascending: false })
      .limit(6);

    let terbaru: DevotionCard | null = null;
    if (!hariIni && arsip && arsip.length > 0) terbaru = arsip[0] as DevotionCard;
    if (!hariIni && !terbaru) {
      // Kasus langka: belum ada edisi sama sekali selain hari ini.
      const { data } = await db
        .from("devotions")
        .select(KOLOM)
        .eq("status", "published")
        .order("devotion_date", { ascending: false })
        .limit(1);
      terbaru = (data?.[0] as DevotionCard) ?? null;
    }

    return {
      hariIni: (hariIni as DevotionCard) ?? null,
      terbaru,
      arsip: (arsip as DevotionCard[]) ?? [],
    };
  },
  ["beranda"],
  { revalidate: 300, tags: ["devotions"] }
);
