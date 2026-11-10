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
    <header className="sticky top-0 z-40 border-b border-garis-tipis bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-abbalove.png"
            alt="Abbalove"
            width={132}
            height={36}
            className="h-8 w-auto rounded-md bg-plum px-2 py-1 shadow-[0_1px_2px_rgba(74,35,82,0.25)]"
          />
          <span className="hidden text-[15px] font-semibold tracking-tight text-plum sm:inline">
            Saat Teduh
            <span className="ml-1.5 font-normal text-tinta-3">· Palem</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-[14px] font-medium">
          <Link
            href="/arsip"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum"
          >
            Arsip
          </Link>
          <Link
            href="/tentang"
            className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
          >
            Tentang
          </Link>
          {isStaff && (
            <Link
              href="/admin"
              className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
            >
              Admin
            </Link>
          )}
          <Link
            href={user ? "/profil" : "/masuk"}
            className="btn btn-utama btn-sm ml-1"
          >
            {user ? "Profil" : "Masuk"}
          </Link>
        </nav>
      </div>
    </header>
  );
}
