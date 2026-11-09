import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";


export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    redirect("/");
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row">
      <aside className="sm:w-48">
        <p className="text-sm font-bold text-[#2B4F8F]">Panel Admin</p>
        <p className="mb-3 text-xs text-slate-500">{profile?.display_name}</p>
        <nav className="flex flex-wrap gap-2 text-sm sm:flex-col">
          <Link href="/admin" className="rounded px-2 py-2 hover:bg-slate-100">
            Dashboard
          </Link>
          <Link href="/admin/saat-teduh" className="rounded px-2 py-2 hover:bg-slate-100">
            Saat Teduh
          </Link>
          <Link href="/admin/saat-teduh/baru" className="rounded px-2 py-2 hover:bg-slate-100">
            Tulis Baru
          </Link>
          <Link href="/admin/statistik" className="rounded px-2 py-2 hover:bg-slate-100">
            Statistik
          </Link>
          {profile?.role === "admin" && (
            <Link href="/admin/pengguna" className="rounded px-2 py-2 hover:bg-slate-100">
              Pengguna
            </Link>
          )}
          <Link href="/" className="rounded px-2 py-2 hover:bg-slate-100">
            Lihat Website
          </Link>
        </nav>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
