import DevotionForm from "@/components/DevotionForm";
import { createClient } from "@/lib/supabase/server";
import { todayJakarta } from "@/lib/dates";


export const dynamic = "force-dynamic";

export default async function NewDevotionPage() {
  const supabase = await createClient();
  const bulan = todayJakarta().slice(0, 7);
  const { data: tema } = await supabase
    .from("themes")
    .select("tema")
    .eq("bulan", bulan)
    .maybeSingle();

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Tulis Saat Teduh Baru</h1>
      <div className="mt-4">
        <DevotionForm bulanIni={bulan} temaAwal={tema?.tema ?? ""} />
      </div>
    </div>
  );
}
