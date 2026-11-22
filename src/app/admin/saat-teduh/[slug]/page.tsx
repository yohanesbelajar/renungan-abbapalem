import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DevotionForm from "@/components/DevotionForm";
import Kepala, { LencanaStatus } from "@/components/admin/Kepala";
import { IkonHati } from "@/components/Ikon";
import { IkonCentang, IkonLuar } from "@/components/admin/IkonAdmin";

export const dynamic = "force-dynamic";

export default async function EditDevotionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  // Kolom author sengaja tidak diambil dari devotions — nama penulis hidup di
  // tabel devotion_authors yang hanya bisa dibaca staf.
  const { data: d } = await supabase
    .from("devotions")
    .select(
      "id, slug, devotion_date, title, summary, body, theme, status, hearts_count"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!d) notFound();

  const [penulis, selesai, temaBulan] = await Promise.all([
    supabase
      .from("devotion_authors")
      .select("nama")
      .eq("devotion_id", d.id)
      .maybeSingle(),
    supabase
      .from("reading_progress")
      .select("devotion_id", { count: "exact", head: true })
      .eq("devotion_id", d.id),
    supabase
      .from("themes")
      .select("tema")
      .eq("bulan", d.devotion_date.slice(0, 7))
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin/saat-teduh"
          className="inline-flex items-center gap-1.5 rounded px-1 py-1 text-[12.5px] font-semibold text-tinta-2 transition hover:text-plum"
        >
          <span aria-hidden>←</span> Semua saat teduh
        </Link>
        <div className="mt-2">
          <Kepala
            label="Sunting"
            judul={d.title}
            aksi={
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-krem-2 px-3 py-1.5 text-[12px] font-semibold text-tinta-2">
                  <IkonHati className="h-[13px] w-[13px]" />
                  {d.hearts_count ?? 0}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-baca-ya px-3 py-1.5 text-[12px] font-semibold text-[#1f6b48]">
                  <IkonCentang className="h-[13px] w-[13px]" />
                  {selesai.count ?? 0} selesai
                </span>
                <Link href={`/saat-teduh/${d.slug}`} target="_blank" className="btn btn-halus btn-sm">
                  <IkonLuar className="h-4 w-4" />
                  Lihat
                </Link>
              </>
            }
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <LencanaStatus status={d.status} />
          {d.theme && (
            <span className="rounded-full bg-lavender px-2.5 py-0.5 text-[11px] font-semibold text-ungu">
              {d.theme}
            </span>
          )}
          {penulis.data?.nama && (
            <span className="text-[11.5px] text-tinta-3">oleh {penulis.data.nama}</span>
          )}
        </div>
      </div>

      <DevotionForm
        bulanIni={d.devotion_date.slice(0, 7)}
        temaAwal={temaBulan.data?.tema ?? d.theme ?? ""}
        initial={{
          id: d.id,
          slug: d.slug,
          devotion_date: d.devotion_date,
          title: d.title,
          summary: d.summary,
          body: d.body,
          theme: d.theme ?? "",
          author: penulis.data?.nama ?? "",
          status: d.status,
        }}
      />
    </div>
  );
}
