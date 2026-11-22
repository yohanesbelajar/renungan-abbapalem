import DevotionForm from "@/components/DevotionForm";
import { createClient } from "@/lib/supabase/server";
import { todayJakarta } from "@/lib/dates";
import Kepala from "@/components/admin/Kepala";

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
    <div className="space-y-5">
      <Kepala
        label="Naskah baru"
        judul="Tulis Saat Teduh"
        keterangan="Simpan sebagai draft bila masih dikerjakan, terbitkan bila sudah siap, atau jadwalkan untuk tanggal mendatang."
      />
      <DevotionForm bulanIni={bulan} temaAwal={tema?.tema ?? ""} />
    </div>
  );
}
