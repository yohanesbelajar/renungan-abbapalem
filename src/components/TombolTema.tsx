"use client";

import { useEffect, useState } from "react";

// Tombol mode gelap/terang. Tiga keadaan: ikut sistem (bawaan), gelap, terang.
// Pilihan disimpan di localStorage "sate-tema" dan dipasang pada <html>
// (data-tema) supaya CSS token langsung berganti — lihat globals.css.
// Skrip kecil di layout membaca nilai itu sebelum cat pertama (anti-kedip).

type Tema = "sistem" | "gelap" | "terang";
const KUNCI = "sate-tema";

function pasang(t: Tema) {
  const el = document.documentElement;
  if (t === "sistem") el.removeAttribute("data-tema");
  else el.setAttribute("data-tema", t);
}

export default function TombolTema({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema>("sistem");

  useEffect(() => {
    const simpan = localStorage.getItem(KUNCI);
    setTema(simpan === "gelap" || simpan === "terang" ? simpan : "sistem");
  }, []);

  function putar() {
    const urutan: Tema[] = ["sistem", "gelap", "terang"];
    const berikut = urutan[(urutan.indexOf(tema) + 1) % urutan.length];
    setTema(berikut);
    pasang(berikut);
    try {
      if (berikut === "sistem") localStorage.removeItem(KUNCI);
      else localStorage.setItem(KUNCI, berikut);
    } catch {
      // localStorage bisa diblokir (mode privat) — tampilan tetap berganti.
    }
  }

  const label =
    tema === "gelap" ? "Mode gelap aktif" : tema === "terang" ? "Mode terang aktif" : "Ikut setelan perangkat";

  return (
    <button
      type="button"
      onClick={putar}
      aria-label={`Tema tampilan — ${label}. Tekan untuk mengganti.`}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-tinta-2 transition hover:bg-lavender hover:text-plum ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-[19px] w-[19px]"
      >
        {tema === "gelap" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        ) : tema === "terang" ? (
          <>
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 3.5v17" />
            <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" opacity="0.55" />
          </>
        )}
      </svg>
    </button>
  );
}
