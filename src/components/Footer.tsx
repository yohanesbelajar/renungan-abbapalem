import Link from "next/link";
import { SITE_NAME, VALUE_STATEMENT } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-garis-tipis bg-[linear-gradient(180deg,#f8f2e9_0%,#f3ecf8_100%)]">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-abbalove.png"
              alt="Abbalove"
              width={160}
              height={43}
              className="h-9 w-auto rounded-[6px] bg-plum px-2.5 py-1.5"
            />
            <p className="mt-4 text-[15px] font-semibold tracking-tight text-plum">
              {SITE_NAME}
            </p>
            <p className="mt-1 text-[14px] text-tinta-2">{VALUE_STATEMENT}</p>
            <p className="mt-1 text-[14px] text-tinta-2">
              Bagian dari keluarga besar Abbalove Ministries.
            </p>
          </div>

          <nav className="flex flex-col gap-2 text-[14px] font-medium text-tinta-2">
            <span className="label-kecil mb-1 text-ungu-2">Jelajahi</span>
            <Link href="/" className="transition hover:text-ungu">
              Beranda
            </Link>
            <Link href="/arsip" className="transition hover:text-ungu">
              Arsip saat teduh
            </Link>
            <Link href="/tentang" className="transition hover:text-ungu">
              Tentang
            </Link>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-garis pt-6 text-[12.5px] text-tinta-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Alkitab dikutip dari ALKITAB (TB) © LAI 1974.
          </p>
          <p>© {new Date().getFullYear()} Abbalove Palem</p>
        </div>
      </div>
    </footer>
  );
}
