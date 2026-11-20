import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { semuaTerbit } from "@/lib/publik";
import { kelompokTema, SITE_URL, slugTema } from "@/lib/topik";
import type { DevotionCard } from "@/lib/types";
import { formatTanggalID } from "@/lib/dates";

export const revalidate = 1800;

async function topikDari(slug: string) {
  const semua = await semuaTerbit();
  const daftar = kelompokTema(semua);
  const t = daftar.find((x) => x.slug === slug);
  if (!t) return null;
  const edisi = semua
    .filter((d) => d.theme && slugTema(d.theme) === slug)
    .sort((a, b) => b.devotion_date.localeCompare(a.devotion_date));
  return { topik: t, edisi };
}

export async function generateStaticParams() {
  const daftar = kelompokTema(await semuaTerbit());
  return daftar.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hasil = await topikDari(slug);
  if (!hasil) return {};
  const { topik, edisi } = hasil;
  return {
    title: `Topik ${topik.tema}`,
    description: `${topik.n} saat teduh bertema “${topik.tema}” (${topik.tahun.join(", ")}) — dari ${formatTanggalID(topik.pertama)} sampai ${formatTanggalID(topik.terakhir)}.`,
    alternates: { canonical: `/topik/${topik.slug}` },
    openGraph: {
      title: `Topik ${topik.tema} — Saat Teduh Abbalove Palem`,
      description: `Kumpulan ${topik.n} saat teduh bertema “${topik.tema}”.`,
      url: `${SITE_URL}/topik/${topik.slug}`,
      type: "website",
      images: [{ url: `/topik/${topik.slug}/opengraph-image`, width: 1200, height: 630 }],
    },
    other: { "og:first": edisi[0]?.slug ?? "" },
  };
}

export default async function TopikPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hasil = await topikDari(slug);
  if (!hasil) notFound();
  const { topik } = hasil;

  // Kartu butuh hearts_count — diambil sekali untuk tema ini saja.
  const supabase = await createClient();
  const { data } = await supabase
    .from("devotions")
    .select("slug, devotion_date, title, theme, hearts_count")
    .eq("status", "published")
    .eq("theme", topik.tema)
    .order("devotion_date", { ascending: false })
    .limit(400);
  const kartu: DevotionCard[] = (data as DevotionCard[] | null) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/topik"
        className="inline-flex min-h-9 items-center text-[14px] font-medium text-tinta-2 transition hover:text-ungu"
      >
        ← Semua topik
      </Link>

      <p className="label-kecil mt-4 text-ungu">Topik</p>
      <h1 className="judul-rapat-sm mt-1 text-[32px] text-plum sm:text-[40px]">
        {topik.tema}
      </h1>
      <p className="mt-2 text-[15px] text-tinta-2">
        {topik.n} edisi · {topik.tahun.join(" · ")}
      </p>
      <p className="mt-1 text-[13.5px] text-tinta-3">
        {formatTanggalID(topik.pertama)} — {formatTanggalID(topik.terakhir)}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {kartu.map((d) => (
          <DevotionCardItem key={d.slug} d={d} />
        ))}
      </div>

      <p className="mt-10 text-[13.5px] text-tinta-2">
        Cari kata atau ayat tertentu?{" "}
        <Link href="/arsip" className="font-semibold text-ungu hover:underline">
          Telusuri arsip
        </Link>
        .
      </p>
    </div>
  );
}
