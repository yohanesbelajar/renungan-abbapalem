"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { muatSesi, type Sesi } from "@/lib/sesi-klien";

// Tombol akun di bilah atas. Server tidak tahu status login (itu yang membuat
// halaman jadi no-store), jadi tombol ini mulai sebagai "Masuk" lalu berganti
// setelah sesi terbaca di browser. Lebar dikunci supaya tata letak tidak geser.
export default function HeaderAkun({ className = "" }: { className?: string }) {
  const [sesi, setSesi] = useState<Sesi | null>(null);

  useEffect(() => {
    let batal = false;
    muatSesi().then((s) => {
      if (!batal) setSesi(s);
    });
    return () => {
      batal = true;
    };
  }, []);

  return (
    <span className="inline-flex items-center gap-1">
      {sesi?.staf && (
        <Link
          href="/admin"
          className={`hidden min-h-11 items-center rounded-full px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum sm:inline-flex ${className}`}
        >
          Admin
        </Link>
      )}
      <Link
        href={sesi?.masuk ? "/profil" : "/masuk"}
        aria-busy={sesi === null}
        className="btn btn-utama btn-sm ml-1 min-w-[76px]"
      >
        {sesi?.masuk ? "Profil" : "Masuk"}
      </Link>
    </span>
  );
}
