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
  const { data: d } = await supabase
    .from("devotions")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!d) notFound();

  const { count: selesai } = await supabase
    .from("reading_progress")
    .select("devotion_id", { count: "exact", head: true })
    .eq("devotion_id", d.id);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Edit Renungan</h1>
      <p className="mt-1 text-sm text-slate-500">
        Status saat ini: <strong>{d.status}</strong> · ♥ {d.hearts_count} · ✓{" "}
        {selesai ?? 0} selesai dibaca
      </p>
      <div className="mt-4">
        <DevotionForm
          initial={{
            id: d.id,
            slug: d.slug,
            devotion_date: d.devotion_date,
            title: d.title,
            summary: d.summary,
            body: d.body,
            verse_reference: d.verse_reference,
            verse_text: d.verse_text,
            theme: d.theme ?? "",
            author: d.author ?? "",
            featured_image_url: d.featured_image_url ?? "",
            status: d.status,
          }}
        />
      </div>
    </div>
  );
}
