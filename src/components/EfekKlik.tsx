"use client";

import { useEffect } from "react";

/**
 * Efek klik halus — hanya saat tombol/tautan benar-benar diklik.
 *
 * Tujuan: memberi tahu pengunjung bahwa klik-nya tercatat. Karena itu
 * pemicunya `click` pada elemen interaktif, bukan setiap sentuhan layar:
 * menggulir, menepuk area kosong, atau menyeret tidak memunculkan apa pun.
 *
 * Teknis: satu pendengar `click` di document (fase tangkap), simpul dibuat
 * langsung di DOM — bukan state React — supaya klik cepat berturut-turut
 * tidak memicu render ulang komponen mana pun. Lapisan pembungkus
 * `pointer-events: none` sehingga tidak pernah menahan klik apa pun.
 */
const PEMILIH = [
  "a[href]",
  "button:not([disabled])",
  "[role='button']",
  "[role='link']",
  "input[type='submit']",
  "input[type='button']",
  "input[type='reset']",
  "input[type='checkbox']",
  "input[type='radio']",
  "label",
  "summary",
  "select",
  "[data-efek-klik]",
].join(",");

export default function EfekKlik() {
  useEffect(() => {
    // Pengunjung yang meminta gerak dikurangi: tetap dapat umpan balik,
    // hanya berupa kilau lembut tanpa pemuaian.
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lapisan: HTMLDivElement | null = null;
    const hidup = new Set<HTMLSpanElement>();

    const wadah = () => {
      if (!lapisan || !lapisan.isConnected) {
        lapisan = document.createElement("div");
        lapisan.className = "efek-klik-lapisan";
        lapisan.setAttribute("aria-hidden", "true");
        document.body.appendChild(lapisan);
      }
      return lapisan;
    };

    const buang = (el: HTMLSpanElement) => {
      hidup.delete(el);
      el.remove();
    };

    const gambar = (x: number, y: number) => {
      const el = document.createElement("span");
      el.className = kurangiGerak.matches
        ? "efek-klik efek-klik-redup"
        : "efek-klik";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      wadah().appendChild(el);
      hidup.add(el);

      el.addEventListener("animationend", () => buang(el), { once: true });
      // Jaring pengaman bila animationend tidak pernah datang (tab latar).
      window.setTimeout(() => {
        if (el.isConnected) buang(el);
      }, 900);

      // Ketukan beruntun tidak menumpuk simpul.
      if (hidup.size > 6) {
        const tertua = hidup.values().next().value;
        if (tertua) buang(tertua);
      }
    };

    const saatKlik = (e: MouseEvent) => {
      // Hanya klik kiri / sentuhan / pena — klik kanan bukan aksi.
      if (e.button !== 0) return;

      const target = e.target as Element | null;
      const sasaran = target?.closest?.(PEMILIH);
      if (!sasaran) return;

      // Klik dari papan ketik (Enter/Spasi) tidak punya koordinat:
      // tampilkan di tengah elemen yang diaktifkan.
      if (e.detail === 0) {
        const r = sasaran.getBoundingClientRect();
        if (r.width || r.height) {
          gambar(r.left + r.width / 2, r.top + r.height / 2);
        }
        return;
      }

      gambar(e.clientX, e.clientY);
    };

    document.addEventListener("click", saatKlik, true);

    return () => {
      document.removeEventListener("click", saatKlik, true);
      hidup.forEach((el) => el.remove());
      hidup.clear();
      lapisan?.remove();
    };
  }, []);

  return null;
}
