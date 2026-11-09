import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Header() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profile: { role: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    profile = data;
  }
  const isStaff = profile?.role === "admin" || profile?.role === "editor";

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-base font-bold text-[#2B4F8F] sm:text-lg">
          Abbalove Palem <span className="hidden sm:inline">— Renungan Harian</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-4">
          <Link href="/arsip" className="rounded px-2 py-2 hover:bg-slate-100">
            Arsip
          </Link>
          <Link href="/tentang" className="rounded px-2 py-2 hover:bg-slate-100">
            Tentang
          </Link>
          {isStaff && (
            <Link href="/admin" className="rounded px-2 py-2 hover:bg-slate-100">
              Admin
            </Link>
          )}
          {user ? (
            <Link
              href="/profil"
              className="rounded-full bg-[#2B4F8F] px-3 py-2 text-white"
            >
              Profil
            </Link>
          ) : (
            <Link
              href="/masuk"
              className="rounded-full bg-[#2B4F8F] px-3 py-2 text-white"
            >
              Masuk
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
