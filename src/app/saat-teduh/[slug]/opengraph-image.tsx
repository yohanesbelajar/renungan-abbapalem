import { createClient } from "@supabase/supabase-js";
import { kartuEdisi } from "@/lib/og";
import { formatTanggalID } from "@/lib/dates";

export const alt = "Saat teduh Abbalove Palem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 86400;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  const { data } = await db
    .from("devotions")
    .select("title, theme, devotion_date")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return kartuEdisi({
    judul: data?.title ?? "Saat Teduh Abbalove Palem",
    tema: data?.theme ?? null,
    tanggal: data?.devotion_date ? formatTanggalID(data.devotion_date) : undefined,
  });
}
