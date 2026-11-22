import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Kepala from "@/components/admin/Kepala";
import { IkonPlus } from "@/components/admin/IkonAdmin";
import DaftarNaskah, { type BarisNaskah } from "@/components/admin/DaftarNaskah";

export const dynamic = "force-dynamic";

export default async function AdminDevotionList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("devotions")
    .select("id, slug, title, devotion_date, status, hearts_count, theme")
    .order("devotion_date", { ascending: false })
    .limit(100);

  const baris = (data ?? []) as BarisNaskah[];

  return (
    <div className="space-y-5">
      <Kepala
        label="Naskah"
        judul="Saat Teduh"
        keterangan="Semua edisi terakhir, terbaru di atas. Klik satu baris untuk menyunting."
        aksi={
          <Link href="/admin/saat-teduh/baru" className="btn btn-utama btn-sm">
            <IkonPlus className="h-4 w-4" />
            Tulis baru
          </Link>
        }
      />
      <DaftarNaskah baris={baris} />
    </div>
  );
}
