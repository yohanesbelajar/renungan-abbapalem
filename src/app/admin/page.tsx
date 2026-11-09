import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggalID, todayJakarta } from "@/lib/dates";


export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = todayJakarta();

  const { data: todayDevotion } = await supabase
    .from("devotions")
    .select("slug, title, status")
    .eq("devotion_date", today)
    .maybeSingle();

  const { data: drafts } = await supabase
    .from("devotions")
    .select("id, title, devotion_date, status")
    .eq("status", "draft")
    .order("updated_at", { ascending: false })
    .limit(5);

  const { data: scheduled } = await supabase
    .from("devotions")
    .select("id, title, devotion_date, scheduled_at")
    .eq("status", "scheduled")
    .order("devotion_date")
    .limit(5);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>

      <div className="mt-4 rounded-lg border border-slate-200 p-4">
        <p className="text-sm text-slate-500">Renungan hari ini ({formatTanggalID(today)})</p>
        {todayDevotion ? (
          <div className="mt-1 flex items-center justify-between">
            <p className="font-semibold">
              {todayDevotion.title}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({todayDevotion.status})
              </span>
            </p>
            <Link
              href={`/admin/renungan/${todayDevotion.slug}`}
              className="text-sm text-[#2B4F8F] hover:underline"
            >
              Edit
            </Link>
          </div>
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <p className="text-slate-600">Belum ada renungan untuk hari ini.</p>
            <Link
              href="/admin/renungan/baru"
              className="rounded-full bg-[#2B4F8F] px-4 py-2 text-sm text-white"
            >
              Tulis Renungan
            </Link>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700">Draft</h2>
          {drafts && drafts.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {drafts.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span className="truncate">{d.title}</span>
                  <Link
                    href={`/admin/renungan/${d.title}`}
                    className="shrink-0 text-[#2B4F8F] hover:underline"
                  >
                    Edit
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Tidak ada draft.</p>
          )}
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-700">Terjadwal</h2>
          {scheduled && scheduled.length > 0 ? (
            <ul className="mt-2 space-y-2 text-sm">
              {scheduled.map((d) => (
                <li key={d.id} className="flex justify-between gap-2">
                  <span className="truncate">
                    {d.title}{" "}
                    <span className="text-xs text-slate-500">
                      ({formatTanggalID(d.devotion_date)})
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Tidak ada renungan terjadwal.</p>
          )}
        </div>
      </div>
    </div>
  );
}
