import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { todayJakarta } from "@/lib/dates";
import { TAGLINE, SITE_NAME } from "@/lib/constants";


const STEPS = [
  { n: 1, t: "Baca", d: "Buka saat teduh hari ini dan baca isinya dengan tenang." },
  { n: 2, t: "Renungkan", d: "Pikirkan pertanyaan refleksi yang disediakan." },
  { n: 3, t: "Terapkan", d: "Jalankan satu langkah nyata dari firman hari ini." },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const today = todayJakarta();

  const { data: todayDevotion } = await supabase
    .from("devotions")
    .select("slug, devotion_date, title, summary, theme, verse_reference, hearts_count")
    .eq("status", "published")
    .eq("devotion_date", today)
    .maybeSingle();

  let latest: (typeof todayDevotion)[] = [];
  if (!todayDevotion) {
    const { data } = await supabase
      .from("devotions")
      .select("slug, devotion_date, title, summary, theme, verse_reference, hearts_count")
      .eq("status", "published")
      .order("devotion_date", { ascending: false })
      .limit(1);
    latest = data ?? [];
  }

  const { data: archive } = await supabase
    .from("devotions")
    .select("slug, devotion_date, title, summary, theme, hearts_count")
    .eq("status", "published")
    .neq("devotion_date", today)
    .order("devotion_date", { ascending: false })
    .limit(6);

  const featured = todayDevotion ?? latest[0] ?? null;

  return (
    <div>
      {/* Hero */}
      <section className="bg-[#FCF5EC] px-4 py-14 text-center">
        <div className="mx-auto max-w-2xl">
          <p className="text-sm text-slate-500">{SITE_NAME}</p>
          <h1 className="mt-2 text-2xl font-bold text-[#9B3F76] sm:text-3xl">
            “{TAGLINE}”
          </h1>
          <p className="mt-3 text-slate-600">
            Satu saat teduh setiap hari untuk jemaat Abbalove Palem dan pembaca
            semua tempat.
          </p>
          {featured && (
            <Link
              href={`/saat-teduh/${featured.slug}`}
              className="mt-6 inline-block rounded-full bg-[#9B3F76] px-6 py-3 text-white transition hover:bg-[#7E3160]"
            >
              Baca Saat Teduh Hari Ini
            </Link>
          )}
        </div>
      </section>

      {/* Saat Teduh hari ini / terbaru */}
      <section className="mx-auto max-w-3xl px-4 py-10">
        {featured ? (
          <div>
            <h2 className="text-lg font-semibold text-slate-700">
              Saat Teduh {featured.devotion_date === today ? "Hari Ini" : "Terbaru"}
            </h2>
            <div className="mt-3">
              <DevotionCardItem d={featured} />
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-slate-500">
            Belum ada saat teduh hari ini. Saat Teduh berikutnya segera hadir —
            “{TAGLINE}”.
          </p>
        )}

        {/* 3 langkah */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-slate-700">
            Tiga langkah sederhana
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-lg border border-slate-200 bg-cream p-4"
              >
                <p className="text-sm font-bold text-[#9B3F76]">
                  {s.n}. {s.t}
                </p>
                <p className="mt-1 text-sm text-slate-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Arsip terbaru */}
        <div className="mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-700">
              Arsip terbaru
            </h2>
            <Link href="/arsip" className="text-sm text-[#9B3F76] hover:underline">
              Lihat semua
            </Link>
          </div>
          {archive && archive.length > 0 ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {archive.map((d) => (
                <DevotionCardItem key={d.slug} d={d} />
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Arsip masih kosong. Saat Teduh yang diterbitkan akan tampil di sini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
