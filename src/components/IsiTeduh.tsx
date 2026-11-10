"use client";

// Penampil isi saat teduh: menerima HTML editor Tiptap (atau teks polos lama),
// membersihkannya, mengubah setiap rujukan ayat menjadi tautan yang membuka
// pop-up ayat, lalu merender per blok dengan gaya yang sama seperti PDF asli.

import { useEffect, useMemo, useRef, useState } from "react";
import { RE_RUJUKAN, parseRujukan, type Rujukan } from "@/lib/ayat";
import { pecahIsi, sanitasiHtml, tautkanAyatHtml, isiHtml, teksKeHtml } from "@/lib/isi";
import { PopupAyat } from "@/components/AyatTeks";

// Kelas pembungkus per jenis blok. `html` berisi blok utuh (sudah termasuk tag
// pembukanya), jadi gaya judul diberikan lewat CSS ke elemen di dalamnya —
// jangan membungkus <p> di dalam <p> atau <table> di dalam <p>.
const KELAS: Record<string, string> = {
  paragraf: "",
  h2: "blok-h2 pt-2",
  h3: "blok-h3 pt-1",
  label: "blok-label pt-3",
  daftar: "daftar-isi rounded-lg bg-krem-2 px-4 py-3 font-bold text-tinta",
  tugas: "daftar-tugas rounded-lg bg-krem-2 px-4 py-3",
  kutipan: "kutipan-isi border-l-[3px] border-ungu/40 bg-krem-2 px-4 py-3 italic text-tinta-2",
  tabel: "bungkus-tabel overflow-x-auto rounded-lg border border-garis",
  kode: "bungkus-kode",
  pemisah: "",
};

export default function IsiTeduh({ isi }: { isi: string }) {
  const wadah = useRef<HTMLDivElement>(null);
  const [rujukan, setRujukan] = useState<Rujukan | null>(null);
  const [salah, setSalah] = useState<string | null>(null);

  const blok = useMemo(() => {
    const mentah = isiHtml(isi) ? isi : teksKeHtml(isi);
    const aman = tautkanAyatHtml(sanitasiHtml(mentah), RE_RUJUKAN);
    return pecahIsi(aman);
  }, [isi]);

  // Klik pada tautan ayat mana pun di dalam isi → pop-up.
  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>("[data-rujukan]");
      if (!target) return;
      e.preventDefault();
      const teks = target.dataset.rujukan ?? "";
      const r = parseRujukan(teks);
      if (r) {
        setSalah(null);
        setRujukan(r);
      } else {
        setSalah(teks);
      }
    };
    el.addEventListener("click", onClick);
    // Tautan luar: buka di tab baru tanpa membocorkan referrer.
    el.querySelectorAll<HTMLAnchorElement>("a[href^='http']").forEach((a) => {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    });
    return () => el.removeEventListener("click", onClick);
  }, [blok]);

  return (
    <>
      <div
        ref={wadah}
        className="isi-teduh mt-8 space-y-4 text-[17.5px] leading-[1.85] text-[#121212]"
      >
        {blok.map((b, i) => (
          <div
            key={i}
            className={KELAS[b.jenis] ?? ""}
            dangerouslySetInnerHTML={{ __html: b.html }}
          />
        ))}
      </div>

      {rujukan && <PopupAyat rujukan={rujukan} tutup={() => setRujukan(null)} />}
      {salah && (
        <div
          role="dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2b2130]/45 p-4"
          onClick={() => setSalah(null)}
        >
          <div className="rounded-2xl border border-garis bg-kertas px-5 py-4 text-sm text-tinta-2">
            Rujukan “{salah}” belum dikenali.
          </div>
        </div>
      )}
    </>
  );
}
