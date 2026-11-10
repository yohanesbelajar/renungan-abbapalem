import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import DevotionActions from "@/components/DevotionActions";
import { TeksAyat, TombolRujukan } from "@/components/AyatTeks";
import type { DevotionCard } from "@/lib/types";

const BULAN_ID = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function kepalaEdisi(iso: string): string {
  return `EDISI ${BULAN_ID[parseInt(iso.slice(5, 7))].toUpperCase()} ${iso.slice(0, 4)}`;
}

function tanggalPanjang(iso: string): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  const hari = new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "Asia/Jakarta" }).format(d);
  return `${hari}, ${new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(d)}`;
}


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
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-[13px] text-tinta-3" aria-label="Breadcrumb">
        <Link href="/" className="transition hover:text-ungu">
          Beranda
        </Link>
        <span aria-hidden>›</span>
        <Link href="/arsip" className="transition hover:text-ungu">
          Arsip
        </Link>
      </nav>

      {/* Kepala edisi + penanda tema */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="label-kecil rounded-full border border-garis bg-kertas px-2.5 py-1 text-tinta-2 shadow-[0_1px_2px_rgba(31,27,24,0.04)]">
          {kepalaEdisi(d.devotion_date)}
        </span>
        {d.theme && (
          <Link
            href={`/arsip?tema=${encodeURIComponent(d.theme)}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.02em] text-ungu-2 transition hover:bg-ungu hover:text-white"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {d.theme}
          </Link>
        )}
      </div>

      {/* Judul — tipografi rapat, bukan banner blok */}
      <h1 className="judul-rapat mt-5 text-[30px] text-plum sm:text-[40px]">
        {d.title}
      </h1>
      <p className="mt-3 text-[14.5px] text-tinta-2">
        {tanggalPanjang(d.devotion_date)}
        {d.author ? ` · ${d.author}` : ""}
      </p>

      <div className="mt-6 h-px w-full bg-garis" />

      {/* Isi: instruksi (rujukan biru tebal), blok pertanyaan tebal + garis,
          label Pengajar/Pengajaran berwarna, paragraf badan bergaya inline */}
      <div className="isi-teduh mt-8 space-y-4 text-[17.5px] leading-[1.85] text-[#121212]">
        {(() => {
          const blok: { jenis: string; teks: string }[] = [];
          for (const raw of d.body.split(/\n{2,}/)) {
            const t = raw.trim();
            if (!t) continue;
            if (t.includes("Bacalah beberapa kali")) blok.push({ jenis: "instruksi", teks: t });
            else if (/^\d+\.\s/.test(t)) blok.push({ jenis: "pertanyaan", teks: t });
            else if (/^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan):$/.test(t))
              blok.push({ jenis: "label", teks: t });
            else blok.push({ jenis: "isi", teks: t });
          }
          return blok.map((b, i) => {
            const berikut = blok[i + 1];
            if (b.jenis === "instruksi") {
              const idx = b.teks.indexOf("Bacalah beberapa kali");
              const rujuk = b.teks.slice(0, idx).trim();
              return (
                <div key={i} className="space-y-3">
                  {rujuk && (
                    <TeksAyat
                      teks={rujuk}
                      kunci={`r${i}`}
                      className="text-[19px] font-bold tracking-tight text-[#0000ff]"
                    />
                  )}
                  <TeksAyat
                    teks={b.teks.slice(idx)}
                    kunci={`s${i}`}
                    className="text-tinta-2"
                  />
                </div>
              );
            }
            if (b.jenis === "pertanyaan") {
              const akhirPertanyaan = !berikut || berikut.jenis !== "pertanyaan";
              return (
                <div key={i} className="rounded-lg bg-krem-2 px-4 py-3">
                  <TeksAyat teks={b.teks} kunci={`q${i}`} className="font-bold text-tinta" />
                  {akhirPertanyaan && <hr className="mt-4 border-garis" />}
                </div>
              );
            }
            if (b.jenis === "label") {
              const merah = b.teks.startsWith("Pengantar");
              return (
                <p
                  key={i}
                  className="pt-3 text-[13px] font-bold uppercase tracking-[0.08em]"
                  style={{ color: merah ? "#c0121a" : "#1a34c8" }}
                >
                  {b.teks.replace(/:$/, "")}
                </p>
              );
            }
            return <TeksAyat key={i} teks={b.teks} kunci={`p${i}`} />;
          });
        })()}
      </div>

      {/* Kaki halaman seperti PDF */}
      <p className="mt-10 text-center text-[12px] italic text-[#a6a6a6]">
        Dept. Pengajaran Abbalove Palem
      </p>

      {/* Rujukan Alkitab saja — teks ayat dibuka lewat pop-up saat rujukan diklik */}
      {d.verse_reference ? (
        <p className="mt-8 rounded-xl border border-garis border-l-[3px] border-l-[#0000ff] bg-[#EEF3FB] px-4 py-3.5 text-[14.5px] font-semibold text-[#0000ff]">
          Ayat bacaan:{" "}
          <TombolRujukan
            rujukan={d.verse_reference}
            teksCadangan={d.verse_text}
            className="font-semibold text-[#0000ff] decoration-[#0000ff]/50"
          />
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
      <nav className="mt-12 grid gap-3 border-t border-garis pt-6 text-[14px] sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/saat-teduh/${prev.slug}`}
            className="group rounded-xl border border-garis bg-kertas p-4 shadow-[0_1px_2px_rgba(31,27,24,0.04)] transition hover:border-ungu/35"
          >
            <span className="label-kecil text-tinta-3">← Sebelumnya</span>
            <span className="mt-1.5 block font-semibold leading-snug text-tinta transition group-hover:text-ungu">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/saat-teduh/${next.slug}`}
            className="group rounded-xl border border-garis bg-kertas p-4 text-right shadow-[0_1px_2px_rgba(31,27,24,0.04)] transition hover:border-ungu/35"
          >
            <span className="label-kecil text-tinta-3">Berikutnya →</span>
            <span className="mt-1.5 block font-semibold leading-snug text-tinta transition group-hover:text-ungu">
              {next.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* Terkait */}
      {related && related.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between gap-3">
            <h2 className="judul-rapat-sm text-[20px] text-tinta">
              Saat teduh terkait
            </h2>
            <Link href="/arsip" className="text-[13.5px] font-semibold text-ungu hover:underline">
              Semua arsip
            </Link>
          </div>
          <div className="mt-4 grid gap-4">
            {related.map((r: DevotionCard) => (
              <DevotionCardItem key={r.slug} d={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
