import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DevotionForm from "@/components/DevotionForm";


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
    <div>
      <h1 className="text-xl font-bold text-slate-900">Edit Saat Teduh</h1>
      <p className="mt-1 text-sm text-slate-500">
        Status saat ini: <strong>{d.status}</strong> · ♥ {d.hearts_count} · ✓{" "}
        {selesai.count ?? 0} selesai dibaca
      </p>
      <div className="mt-4">
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
    </div>
  );
}
