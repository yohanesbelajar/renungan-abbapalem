import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggalID } from "@/lib/dates";


export const dynamic = "force-dynamic";

export default async function AdminDevotionList() {
  const supabase = await createClient();
  const { data: devotions } = await supabase
    .from("devotions")
    .select("id, slug, title, devotion_date, status, hearts_count")
    .order("devotion_date", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Saat Teduh</h1>
        <Link
          href="/admin/saat-teduh/baru"
          className="rounded-full bg-[#9B3F76] px-4 py-2 text-sm text-white"
        >
          Tulis Baru
        </Link>
      </div>
      {devotions && devotions.length > 0 ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="py-2">Tanggal</th>
              <th className="py-2">Judul</th>
              <th className="py-2">Status</th>
              <th className="py-2">♥</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devotions.map((d) => (
              <tr key={d.id}>
                <td className="py-2 whitespace-nowrap">
                  {formatTanggalID(d.devotion_date)}
                </td>
                <td className="py-2">{d.title}</td>
                <td className="py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                    {d.status}
                  </span>
                </td>
                <td className="py-2">{d.hearts_count}</td>
                <td className="py-2 text-right">
                  <Link
                    href={`/admin/saat-teduh/${d.slug}`}
                    className="text-[#9B3F76] hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Belum ada saat teduh. Klik “Tulis Baru” untuk membuat yang pertama.
        </p>
      )}
    </div>
  );
}
