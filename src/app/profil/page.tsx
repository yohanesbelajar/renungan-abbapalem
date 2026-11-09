import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import LogoutButton from "@/components/LogoutButton";


export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk?next=/profil");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, role")
    .eq("id", user.id)
    .single();

  const { count: completedCount } = await supabase
    .from("reading_progress")
    .select("devotion_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { count: heartCount } = await supabase
    .from("favorites")
    .select("devotion_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const { data: history } = await supabase
    .from("reading_progress")
    .select(
      "completed_at, devotions (slug, title, devotion_date)"
    )
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Perjalanan Saya</h1>
          <p className="mt-1 text-sm text-slate-500">
            {profile?.display_name} · {profile?.email} ·{" "}
            {profile?.role === "member" ? "Anggota" : profile?.role === "editor" ? "Editor" : "Admin"}
          </p>
        </div>
        <LogoutButton />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-[#2B4F8F]">{completedCount ?? 0}</p>
          <p className="mt-1 text-sm text-slate-600">Saat Teduh selesai dibaca</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4 text-center">
          <p className="text-3xl font-bold text-[#B4433E]">{heartCount ?? 0}</p>
          <p className="mt-1 text-sm text-slate-600">Heart diberikan</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-slate-700">
        Riwayat bacaan selesai
      </h2>
      {history && history.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {history.map((h) => {
            const d = h.devotions as unknown as {
              slug: string;
              title: string;
              devotion_date: string;
            };
            return (
              <li key={d.slug} className="flex items-center justify-between py-3">
                <Link href={`/saat-teduh/${d.slug}`} className="hover:text-[#2B4F8F]">
                  {d.title}
                </Link>
                <span className="text-xs text-slate-500">
                  {formatTanggalID(d.devotion_date)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">
          Belum ada saat teduh yang ditandai selesai. Baca saat teduh lalu tekan
          “Tandai selesai membaca”.
        </p>
      )}
    </div>
  );
}
