"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IkonDasbor,
  IkonDaftar,
  IkonGrup,
  IkonLuar,
  IkonOrang,
  IkonTulis,
  IkonGrafik,
} from "@/components/admin/IkonAdmin";

type Item = { href: string; label: string; Ikon: (p: { className?: string }) => React.ReactElement };

export default function NavigasiAdmin({ peran }: { peran: string }) {
  const path = usePathname();

  const utama: Item[] = [
    { href: "/admin", label: "Dasbor", Ikon: IkonDasbor },
    { href: "/admin/saat-teduh", label: "Saat Teduh", Ikon: IkonDaftar },
    { href: "/admin/saat-teduh/baru", label: "Tulis Baru", Ikon: IkonTulis },
    { href: "/admin/statistik", label: "Statistik", Ikon: IkonGrafik },
  ];
  if (peran === "admin" || peran === "superadmin") {
    utama.push({ href: "/admin/pengguna", label: "Pengguna", Ikon: IkonOrang });
  }
  if (peran === "superadmin") {
    utama.push({ href: "/admin/grup", label: "Grup", Ikon: IkonGrup });
  }

  const aktif = (href: string) =>
    href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/");

  // "Tulis Baru" tidak boleh menyala saat sedang di /admin/saat-teduh/<slug>.
  const menyala = (href: string) => {
    if (href === "/admin/saat-teduh/baru") return path === "/admin/saat-teduh/baru";
    if (href === "/admin/saat-teduh") return path.startsWith("/admin/saat-teduh") && path !== "/admin/saat-teduh/baru";
    return aktif(href);
  };

  return (
    <nav aria-label="Navigasi panel admin" className="flex flex-wrap gap-1 sm:flex-col">
      {utama.map(({ href, label, Ikon }) => {
        const nyala = menyala(href);
        return (
          <Link
            key={href}
            href={href}
            data-nav={href}
            data-aktif={nyala ? "ya" : "tidak"}
            aria-current={nyala ? "page" : undefined}
            className={`group inline-flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13.5px] font-semibold transition ${
              nyala
                ? "bg-lavender text-plum shadow-[inset_0_0_0_1px_rgba(150,50,150,0.18)]"
                : "text-tinta-2 hover:bg-krem-2 hover:text-plum"
            }`}
          >
            <Ikon className={`h-[17px] w-[17px] ${nyala ? "text-ungu" : "text-tinta-3 group-hover:text-ungu"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TautanLuar() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13.5px] font-semibold text-tinta-2 transition hover:bg-krem-2 hover:text-plum"
    >
      <IkonLuar className="h-[17px] w-[17px] text-tinta-3" />
      Lihat website
    </Link>
  );
}
