import { createClient } from "@/lib/supabase/server";
import { formatTanggalID } from "@/lib/dates";


export const dynamic = "force-dynamic";

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const { data: stats } = await supabase.from("admin_stats").select("*").limit(200);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Statistik</h1>
      <p className="mt-1 text-sm text-slate-500">Jumlah heart dan penanda selesai per saat teduh.</p>
      {stats && stats.length > 0 ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="py-2">Tanggal</th>
              <th className="py-2">Judul</th>
              <th className="py-2 text-right">♥ Heart</th>
              <th className="py-2 text-right">✓ Selesai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {stats.map((s) => (
              <tr key={s.id}>
                <td className="py-2 whitespace-nowrap">
                  {formatTanggalID(s.devotion_date)}
                </td>
                <td className="py-2">{s.title}</td>
                <td className="py-2 text-right">{s.hearts_count}</td>
                <td className="py-2 text-right">{s.selesai_dibaca}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada data statistik.</p>
      )}
    </div>
  );
}
