import Link from "next/link";
import { SITE_NAME, VALUE_STATEMENT } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="mt-12 border-t border-slate-200 bg-slate-50 py-8 text-center text-sm text-slate-500">
      <p className="font-semibold text-slate-700">{SITE_NAME}</p>
      <p className="mt-1">{VALUE_STATEMENT}</p>
      <p className="mt-1">Bagian dari keluarga besar Abbalove Ministries.</p>
      <p className="mt-3 text-xs">
        Alkitab dikutip dari ALKITAB (TB) © LAI 1974.
      </p>
      <div className="mt-3 flex justify-center gap-4">
        <Link href="/arsip" className="hover:text-[#9B3F76]">
          Arsip
        </Link>
        <Link href="/tentang" className="hover:text-[#9B3F76]">
          Tentang
        </Link>
      </div>
    </footer>
  );
}
