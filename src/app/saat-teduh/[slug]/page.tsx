import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { LAI_CREDIT } from "@/lib/constants";
import DevotionCardItem from "@/components/DevotionCardItem";
import DevotionActions from "@/components/DevotionActions";
import type { DevotionCard } from "@/lib/types";

// Gaya inline hasil parse PDF: **{#hex}teks** (tebal), ~~{#hex}teks~~ (miring).
// Warna hitam ditulis tanpa {#hex}. Parser di dalam tebal juga memecah miring.
function italik(teks: string, kunci: string): React.ReactNode[] {
  const keluar: React.ReactNode[] = [];
  const re = /~~(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)~~/g;
  let terakhir = 0;
  let m;
  while ((m = re.exec(teks))) {
    if (m.index > terakhir) keluar.push(teks.slice(terakhir, m.index));
    keluar.push(
      <em key={`${kunci}-i${m.index}`} style={m[1] ? { color: m[1] } : undefined}>
        {m[2]}
      </em>
    );
    terakhir = re.lastIndex;
  }
  if (terakhir < teks.length) keluar.push(teks.slice(terakhir));
  return keluar;
}

function gayaTeks(teks: string, kunci = "b"): React.ReactNode[] {
  const keluar: React.ReactNode[] = [];
  const re = /\*\*(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)\*\*/g;
  let terakhir = 0;
  let m;
  while ((m = re.exec(teks))) {
    if (m.index > terakhir) keluar.push(...italik(teks.slice(terakhir, m.index), `${kunci}p${m.index}`));
    keluar.push(
      <strong key={`${kunci}b${m.index}`} style={m[1] ? { color: m[1] } : undefined}>
        {italik(m[2], `${kunci}i${m.index}`)}
      </strong>
    );
    terakhir = re.lastIndex;
  }
  if (terakhir < teks.length) keluar.push(...italik(teks.slice(terakhir), `${kunci}t`));
  return keluar;
}

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
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#9B3F76]">
          Beranda
        </Link>{" "}
        › <span>Saat Teduh</span>
      </nav>

      {/* Kepala edisi + penanda tema (kanan atas, abu-abu tipis — seperti PDF) */}
      <div className="mt-4 flex items-baseline justify-between gap-3 text-xs italic text-[#a6a6a6]">
        <span>{kepalaEdisi(d.devotion_date)}</span>
        {d.theme && <span className="text-right uppercase">{d.theme}</span>}
      </div>

      {/* Banner ungu: tanggal kiri, judul kanan */}
      <div className="mt-2 rounded-lg bg-[#963296] px-4 py-3 text-white sm:px-6 sm:py-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm font-bold sm:text-base">{tanggalPanjang(d.devotion_date)}</span>
          <h1 className="text-lg font-bold italic uppercase sm:text-right sm:text-xl">
            {d.title}
          </h1>
        </div>
      </div>

      {/* Isi: instruksi (rujukan biru tebal), blok pertanyaan tebal + garis,
          label Pengajar/Pengajaran berwarna, paragraf badan bergaya inline */}
      <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-[#121212]">
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
                    <p className="text-lg font-bold text-[#0000ff]">{gayaTeks(rujuk, `r${i}`)}</p>
                  )}
                  <p className="text-slate-800">{gayaTeks(b.teks.slice(idx), `s${i}`)}</p>
                </div>
              );
            }
            if (b.jenis === "pertanyaan") {
              const akhirPertanyaan = !berikut || berikut.jenis !== "pertanyaan";
              return (
                <div key={i}>
                  <p className="font-bold text-slate-900">{gayaTeks(b.teks, `q${i}`)}</p>
                  {akhirPertanyaan && <hr className="mt-4 border-slate-300" />}
                </div>
              );
            }
            if (b.jenis === "label") {
              const merah = b.teks.startsWith("Pengantar");
              return (
                <p
                  key={i}
                  className="pt-2 font-bold italic"
                  style={{ color: merah ? "#ff0000" : "#0000ff" }}
                >
                  {b.teks}
                </p>
              );
            }
            return <p key={i}>{gayaTeks(b.teks, `p${i}`)}</p>;
          });
        })()}
      </div>

      {/* Kaki halaman seperti PDF */}
      <p className="mt-8 text-center text-xs italic text-[#a6a6a6]">
        Dept. Pengajaran Abbalove Palem
      </p>

      {/* Kutipan Alkitab (hanya bila ada teks kutipan) */}
      {d.verse_text ? (
        <blockquote className="mt-8 max-h-[32rem] overflow-y-auto overscroll-contain rounded-lg border-l-4 border-[#0000ff] bg-[#EEF3FB] p-4">
          <p className="italic">“{d.verse_text}”</p>
          <p className="mt-2 text-sm font-semibold text-[#0000ff]">
            — {d.verse_reference}
          </p>
          <p className="mt-1 text-xs text-slate-500">{LAI_CREDIT}</p>
        </blockquote>
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
