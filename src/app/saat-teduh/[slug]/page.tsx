import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatTanggalID } from "@/lib/dates";
import { LAI_CREDIT } from "@/lib/constants";
import DevotionCardItem from "@/components/DevotionCardItem";
import DevotionActions from "@/components/DevotionActions";
import type { DevotionCard } from "@/lib/types";


export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("devotions")
    .select("title, summary")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!data) return {};
  return {
    title: data.title,
    description: data.summary || undefined,
    openGraph: { title: data.title, description: data.summary || undefined },
  };
}

export default async function DevotionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: d } = await supabase
    .from("devotions")
    .select(
      "id, slug, devotion_date, title, summary, body, verse_reference, verse_text, theme, author, hearts_count"
    )
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!d) notFound();

  const { data: prev } = await supabase
    .from("devotions")
    .select("slug, title, devotion_date, summary, theme, hearts_count")
    .eq("status", "published")
    .lt("devotion_date", d.devotion_date)
    .order("devotion_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: next } = await supabase
    .from("devotions")
    .select("slug, title, devotion_date, summary, theme, hearts_count")
    .eq("status", "published")
    .gt("devotion_date", d.devotion_date)
    .order("devotion_date")
    .limit(1)
    .maybeSingle();

  const { data: related } = d.theme
    ? await supabase
        .from("devotions")
        .select("slug, title, devotion_date, summary, theme, hearts_count")
        .eq("status", "published")
        .eq("theme", d.theme)
        .neq("id", d.id)
        .order("devotion_date", { ascending: false })
        .limit(3)
    : { data: [] };

  // Status heart/selesai pengguna login
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let hearted = false;
  let completed = false;
  if (user) {
    const [fav, prog] = await Promise.all([
      supabase
        .from("favorites")
        .select("devotion_id")
        .eq("user_id", user.id)
        .eq("devotion_id", d.id)
        .maybeSingle(),
      supabase
        .from("reading_progress")
        .select("devotion_id")
        .eq("user_id", user.id)
        .eq("devotion_id", d.id)
        .maybeSingle(),
    ]);
    hearted = !!fav.data;
    completed = !!prog.data;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#9B3F76]">
          Beranda
        </Link>{" "}
        › <span>Saat Teduh</span>
      </nav>

      <header className="mt-4">
        <p className="text-sm text-slate-500">
          {formatTanggalID(d.devotion_date)}
          {d.theme ? ` · Tema: ${d.theme}` : ""}
          {d.author ? ` · ${d.author}` : ""}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
          {d.title}
        </h1>
      </header>

      {/* Isi */}
      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-slate-700">
        {d.body.split(/\n{2,}/).map((p: string, i: number) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      {/* Kutipan Alkitab */}
      {d.verse_text ? (
        <blockquote className="mt-8 rounded-lg border-l-4 border-[#9B3F76] bg-[#FCF5EC] p-4">
          <p className="italic">“{d.verse_text}”</p>
          <p className="mt-2 text-sm font-semibold text-[#9B3F76]">
            — {d.verse_reference}
          </p>
          <p className="mt-1 text-xs text-slate-500">{LAI_CREDIT}</p>
        </blockquote>
      ) : d.verse_reference ? (
        <p className="mt-8 rounded-lg border-l-4 border-[#9B3F76] bg-[#FCF5EC] p-4 text-sm font-semibold text-[#9B3F76]">
          Ayat rujukan: {d.verse_reference}
          <span className="mt-1 block text-xs font-normal text-slate-500">
            {LAI_CREDIT}
          </span>
        </p>
      ) : null}

      {/* Aksi */}
      <DevotionActions
        devotionId={d.id}
        heartsCount={d.hearts_count}
        initialHearted={hearted}
        initialCompleted={completed}
        loggedIn={!!user}
      />

      {/* Navigasi sebelum/berikutnya */}
      <nav className="mt-10 flex justify-between gap-3 text-sm">
        {prev ? (
          <Link href={`/saat-teduh/${prev.slug}`} className="hover:text-[#9B3F76]">
            ← Sebelumnya: {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/saat-teduh/${next.slug}`} className="hover:text-[#9B3F76]">
            Berikutnya: {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* Terkait */}
      {related && related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-700">
            Saat Teduh terkait
          </h2>
          <div className="mt-3 grid gap-3">
            {related.map((r: DevotionCard) => (
              <DevotionCardItem key={r.slug} d={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
