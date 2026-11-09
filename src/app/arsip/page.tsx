import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { DevotionCard } from "@/lib/types";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arsip Renungan",
  description:
    "Jelajahi seluruh renungan harian Abbalove Palem — filter berdasarkan bulan, tahun, dan tema.",
};

const MONTHS = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tema?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("devotions")
    .select("slug, devotion_date, title, summary, theme, hearts_count")
    .eq("status", "published")
    .order("devotion_date", { ascending: false })
    .limit(60);

  if (sp.bulan && /^\d{4}-\d{2}$/.test(sp.bulan)) {
    q = q.gte("devotion_date", `${sp.bulan}-01`).lt(
      "devotion_date",
      sp.bulan.endsWith("-12")
        ? `${parseInt(sp.bulan.slice(0, 4)) + 1}-01-01`
        : `${sp.bulan.slice(0, 4)}-${String(parseInt(sp.bulan.slice(5)) + 1).padStart(2, "0")}-01`
    );
  }
  if (sp.tema) q = q.eq("theme", sp.tema);

  const { data: devotions } = await q;

  // Opsi filter: tahun-tahun yang ada + daftar tema
  const { data: allPub } = await supabase
    .from("devotions")
    .select("devotion_date, theme")
    .eq("status", "published")
    .order("devotion_date", { ascending: false })
    .limit(500);

  const years = [
    ...new Set((allPub ?? []).map((d) => d.devotion_date.slice(0, 4))),
  ].sort((a, b) => b.localeCompare(a));
  const themeList = [
    ...new Set(
      (allPub ?? [])
        .map((d) => d.theme)
        .filter((t): t is string => !!t)
    ),
  ].sort();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Arsip Renungan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cari renungan berdasarkan bulan atau tema.
      </p>

      {/* Filter */}
      <form method="GET" action="/arsip" className="mt-4 flex flex-wrap gap-2">
        <select
          name="bulan"
          defaultValue={sp.bulan ?? ""}
          className="min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Bulan"
        >
          <option value="">Semua bulan</option>
          {years.flatMap((y) =>
            MONTHS.slice(1).map((mn, i) => (
              <option key={`${y}-${i}`} value={`${y}-${String(i + 1).padStart(2, "0")}`}>
                {mn} {y}
              </option>
            ))
          )}
        </select>
        <select
          name="tema"
          defaultValue={sp.tema ?? ""}
          className="min-h-11 rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          aria-label="Tema"
        >
          <option value="">Semua tema</option>
          {themeList.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="min-h-11 rounded-full bg-[#2B4F8F] px-4 py-2 text-sm text-white"
        >
          Tampilkan
        </button>
        {(sp.bulan || sp.tema) && (
          <Link
            href="/arsip"
            className="flex min-h-11 items-center rounded-full border border-slate-300 px-4 py-2 text-sm"
          >
            Reset
          </Link>
        )}
      </form>

      {/* Daftar */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(devotions ?? []).map((d: DevotionCard) => (
          <DevotionCardItem key={d.slug} d={d} />
        ))}
      </div>
      {(!devotions || devotions.length === 0) && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Tidak ada renungan yang cocok dengan filter ini.
        </p>
      )}
    </div>
  );
}
