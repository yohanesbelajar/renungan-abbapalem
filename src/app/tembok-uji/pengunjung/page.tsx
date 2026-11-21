import { ringkasanPengunjung } from "@/lib/pengunjung";
import KartuPengunjung from "@/components/KartuPengunjung";

export const dynamic = "force-dynamic";

// HALAMAN UJI SEMENTARA — dihapus sebelum commit.
export default async function TembokUjiPengunjung() {
  const data = await ringkasanPengunjung(14);
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-bold text-slate-900">Uji kartu pengunjung (sementara)</h1>
      <KartuPengunjung data={data} />
    </div>
  );
}
