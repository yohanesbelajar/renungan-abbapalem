"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import TombolTema from "./TombolTema";
import { muatSesi } from "@/lib/sesi-klien";

// Menu tambahan khusus layar HP (< sm), tempat tautan "Tentang"/"Admin"
// disembunyikan dari bilah atas karena ruang tidak cukup.
// Status staf dibaca di browser (server tidak lagi menyentuh cookie).
export default function MenuMobile() {
  const [buka, setBuka] = useState(false);
  const [staf, setStaf] = useState(false);
  const kotak = useRef<HTMLDivElement>(null);
  const jalur = usePathname();

  useEffect(() => {
    let batal = false;
    muatSesi().then((s) => {
      if (!batal) setStaf(s.staf);
    });
    return () => {
      batal = true;
    };
  }, []);

  useEffect(() => setBuka(false), [jalur]);

  useEffect(() => {
    if (!buka) return;
    function diLuar(e: MouseEvent) {
      if (kotak.current && !kotak.current.contains(e.target as Node)) setBuka(false);
    }
    function tombolEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setBuka(false);
    }
    document.addEventListener("mousedown", diLuar);
    document.addEventListener("keydown", tombolEsc);
    return () => {
      document.removeEventListener("mousedown", diLuar);
      document.removeEventListener("keydown", tombolEsc);
    };
  }, [buka]);

  return (
    <div ref={kotak} className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-controls="menu-hp"
        aria-label="Menu lainnya"
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-tinta-2 transition hover:bg-lavender hover:text-plum aria-expanded:bg-lavender aria-expanded:text-plum"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          {buka ? (
            <path d="M6 6l12 12M18 6 6 18" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" />
          )}
        </svg>
      </button>

      {buka && (
        <div
          id="menu-hp"
          className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-2xl border border-garis-tipis bg-cream p-1.5 shadow-[0_16px_40px_-18px_rgba(53,22,58,0.45)]"
        >
          <Link
            href="/arsip"
            className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum"
          >
            Arsip
          </Link>
          <div className="flex items-center justify-between gap-2 rounded-xl px-1">
            <span className="pl-2 text-[14px] font-medium text-tinta-2">Tema tampilan</span>
            <TombolTema />
          </div>
          <Link
            href="/topik"
            className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum"
          >
            Topik
          </Link>
          <Link
            href="/grup"
            className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum"
          >
            Grup
          </Link>
          <Link
            href="/tentang"
            className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum"
          >
            Tentang
          </Link>
          {staf && (
            <Link
              href="/admin"
              className="flex min-h-11 items-center rounded-xl px-3 text-[14px] font-medium text-tinta-2 transition hover:bg-lavender hover:text-plum"
            >
              Admin
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
