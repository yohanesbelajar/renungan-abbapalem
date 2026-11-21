import Link from "next/link";
import MenuMobile from "./MenuMobile";
import HeaderAkun from "./HeaderAkun";
import TombolTema from "./TombolTema";

// Header ini SENGAJA tidak menyentuh cookie/sesi. Dulu ia memanggil
// createClient() lalu auth.getUser(), sehingga setiap halaman ditandai
// "private, no-store" dan tidak pernah masuk cache CDN. Status login kini
// dibaca di browser (HeaderAkun + MenuMobile) — lihat lib/sesi-klien.ts.
export default function Header() {
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
            className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
          >
            Arsip
          </Link>
          <Link
            href="/topik"
            className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
          >
            Topik
          </Link>
          <Link
            href="/grup"
            className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
          >
            Grup
          </Link>
          <Link
            href="/tentang"
            className="hidden min-h-11 items-center rounded-full px-3 text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex"
          >
            Tentang
          </Link>
          <TombolTema className="hidden sm:inline-flex" />
          <HeaderAkun />
          <MenuMobile />
        </nav>
      </div>
    </header>
  );
}
