import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { DevotionCard } from "@/lib/types";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arsip Saat Teduh",
  description:
    "Cari saat teduh berdasarkan topik, ayat, bulan, atau tema — arsip harian Abbalove Palem.",
};

const MONTHS = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Bersihkan istilah pencarian dari karakter khusus sintaks PostgREST
// (koma, kurung, bintang, %, _) supaya filter .or() tidak rusak.
function sanitize(q: string): string {
  return q.replace(/[%,*()_]/g, " ").replace(/\s+/g, " ").trim();
}

function bulanDari(ym: string): string {
  return `${MONTHS[parseInt(ym.slice(5))]} ${ym.slice(0, 4)}`;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tema?: string; cari?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const cari = sanitize(sp.cari ?? "");

  let q = supabase
    .from("devotions")
    .select(
      "slug, devotion_date, title, summary, theme, verse_reference, hearts_count"
    )
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

  // Pencarian topik & ayat: judul, ringkasan, tema, referensi ayat, isi.
  // Varian kedua menyisipkan spasi sebelum angka agar "matius9" tetap
  // menemukan "Matius 9".
  if (cari) {
    const pats = new Set([cari]);
    const alt = cari.replace(/(\D)(\d)/g, "$1 $2");
    if (alt !== cari) pats.add(alt);
    const cond = [...pats]
      .map(
        (p) =>
          `title.ilike.*${p}*,summary.ilike.*${p}*,theme.ilike.*${p}*,verse_reference.ilike.*${p}*,body.ilike.*${p}*`
      )
      .join(",");
    q = q.or(cond);
  }

  const { data: devotions } = await q;

  // Opsi filter: tahun-tahun yang ada + daftar tema + topik bulanan
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

  // Topik bulanan: tema menonjol per bulan (tema paling sering muncul)
  const bulanan = new Map<string, { label: string; theme: string | null }>();
  for (const d of allPub ?? []) {
    const ym = d.devotion_date.slice(0, 7);
    if (!bulanan.has(ym)) bulanan.set(ym, { label: bulanDari(ym), theme: null });
    if (d.theme && !bulanan.get(ym)!.theme) bulanan.get(ym)!.theme = d.theme;
  }
  const topikBulanan = [...bulanan.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  // Kelompokkan hasil per bulan untuk penanda tema bulan di arsip
  type Grup = { ym: string; label: string; theme: string | null; items: DevotionCard[] };
  const grup: Grup[] = [];
  for (const d of (devotions ?? []) as DevotionCard[]) {
    const ym = d.devotion_date.slice(0, 7);
    let g = grup[grup.length - 1];
    if (!g || g.ym !== ym) {
      g = { ym, label: bulanDari(ym), theme: null, items: [] };
      grup.push(g);
    }
    g.items.push(d);
  }
  for (const g of grup) {
    const hitung = new Map<string, number>();
    for (const d of g.items)
      if (d.theme) hitung.set(d.theme, (hitung.get(d.theme) ?? 0) + 1);
    g.theme =
      [...hitung.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  const adaFilter = !!(sp.bulan || sp.tema || sp.cari);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Arsip Saat Teduh</h1>
      <p className="mt-1 text-sm text-slate-500">
        Cari berdasarkan topik atau ayat — mis. “jiwa” atau “Matius 9”.
      </p>

      {/* Pencarian topik / ayat */}
      <form
        method="GET"
        action="/arsip"
        className="mt-4 flex flex-wrap gap-2"
      >
        <input
          type="search"
          name="cari"
          defaultValue={sp.cari ?? ""}
          placeholder="Cari topik atau ayat… (jiwa, Matius 9)"
          className="min-h-11 min-w-0 flex-1 rounded border border-slate-300 bg-cream px-3 py-2 text-sm"
          aria-label="Cari topik atau ayat"
        />
        <button
          type="submit"
          className="min-h-11 rounded-full bg-[#A1177C] px-5 py-2 text-sm text-white"
        >
          Cari
        </button>
      </form>

      {/* Filter bulan & tema */}
      <form method="GET" action="/arsip" className="mt-2 flex flex-wrap gap-2">
        {sp.cari && <input type="hidden" name="cari" value={sp.cari} />}
        <select
          name="bulan"
          defaultValue={sp.bulan ?? ""}
          className="min-h-11 rounded border border-slate-300 bg-cream px-3 py-2 text-sm"
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
          className="min-h-11 rounded border border-slate-300 bg-cream px-3 py-2 text-sm"
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
          className="min-h-11 rounded-full border border-[#A1177C] px-4 py-2 text-sm text-[#A1177C]"
        >
          Tampilkan
        </button>
        {adaFilter && (
          <Link
            href="/arsip"
            className="flex min-h-11 items-center rounded-full border border-slate-300 px-4 py-2 text-sm"
          >
            Reset
          </Link>
        )}
      </form>

      {/* Topik bulanan menonjol */}
      {!sp.bulan && topikBulanan.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Topik tiap bulan
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {topikBulanan.map(([ym, v]) => (
              <Link
                key={ym}
                href={`/arsip?bulan=${ym}`}
                className="rounded-full border border-[#A1177C]/30 bg-[#FCF5EC] px-3 py-1.5 text-sm font-medium text-[#A1177C] hover:bg-[#F6E9D8]"
              >
                {v.label}
                {v.theme ? ` — ${v.theme}` : ""}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Hasil, dikelompokkan per bulan dengan tema bulan */}
      <div className="mt-6 space-y-6">
        {grup.map((g) => (
          <section key={g.ym}>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
              <h2 className="text-base font-bold text-slate-800">{g.label}</h2>
              {g.theme && (
                <Link
                  href={`/arsip?tema=${encodeURIComponent(g.theme)}`}
                  className="rounded-full bg-[#A1177C] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#87145F]"
                >
                  Tema bulan: {g.theme}
                </Link>
              )}
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {g.items.map((d) => (
                <DevotionCardItem key={d.slug} d={d} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {(!devotions || devotions.length === 0) && (
        <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
          Tidak ada saat teduh yang cocok
          {cari ? ` dengan kata “${cari}”` : " dengan filter ini"}.
        </p>
      )}
    </div>
  );
}
