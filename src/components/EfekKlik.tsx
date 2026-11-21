"use client";

import { useEffect } from "react";

/**
 * Efek klik halus di seluruh situs.
 *
 * Tujuan: memberi tahu pengunjung bahwa tekanannya tercatat — tanpa
 * mengganggu. Satu cincin tipis + pendar lembut yang memudar < 0,5 detik
 * di titik tekan, lalu hilang total (tidak ada elemen yang tertinggal).
 *
 * Teknis: satu pendengar `pointerdown` di document (menangkap mouse, sentuh,
 * pena), simpul dibuat langsung di DOM — bukan state React — supaya klik
 * cepat berturut-turut tidak memicu render ulang komponen mana pun.
 * Lapisan pembungkus `pointer-events: none` sehingga tidak pernah menahan
 * klik dari tombol/tautan di bawahnya.
 *
 * Sentuhan yang berubah jadi geser (menggulir halaman) membatalkan cincin,
 * jadi menggulir tidak meninggalkan jejak efek.
 */
export default function EfekKlik() {
  useEffect(() => {
    // Pengunjung yang meminta gerak dikurangi: tetap dapat umpan balik,
    // hanya berupa kilau lembut tanpa pemuaian.
    const kurangiGerak = window.matchMedia("(prefers-reduced-motion: reduce)");

    let lapisan: HTMLDivElement | null = null;
    const hidup = new Set<HTMLSpanElement>();

    // Tekanan yang sedang berlangsung, untuk membatalkan saat geser.
    let aktif: { el: HTMLSpanElement; x: number; y: number; id: number } | null = null;

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
      if (aktif?.el === el) aktif = null;
      el.remove();
    };

    const saatTekan = (e: PointerEvent) => {
      // Klik kanan/tengah bukan "action click" yang perlu dirayakan.
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const el = document.createElement("span");
      el.className = kurangiGerak.matches
        ? "efek-klik efek-klik-redup"
        : "efek-klik";
      el.style.left = `${e.clientX}px`;
      el.style.top = `${e.clientY}px`;
      wadah().appendChild(el);
      hidup.add(el);
      aktif = { el, x: e.clientX, y: e.clientY, id: e.pointerId };

      el.addEventListener("animationend", () => buang(el), { once: true });
      // Jaring pengaman bila animationend tidak pernah datang (tab latar).
      window.setTimeout(() => {
        if (el.isConnected) buang(el);
      }, 900);

      // Ketukan beruntun (mis. dobel-klik cepat) tidak menumpuk simpul.
      if (hidup.size > 6) {
        const tertua = hidup.values().next().value;
        if (tertua) buang(tertua);
      }
    };

    // Geser lebih dari 12 px = pengunjung menggulir, bukan menekan.
    const saatGeser = (e: PointerEvent) => {
      if (!aktif || e.pointerId !== aktif.id) return;
      const jauh =
        Math.abs(e.clientX - aktif.x) > 12 || Math.abs(e.clientY - aktif.y) > 12;
      if (jauh) buang(aktif.el);
    };

    const saatLepas = (e: PointerEvent) => {
      if (aktif && e.pointerId === aktif.id) aktif = null;
    };

    document.addEventListener("pointerdown", saatTekan, { passive: true });
    document.addEventListener("pointermove", saatGeser, { passive: true });
    document.addEventListener("pointerup", saatLepas, { passive: true });
    document.addEventListener("pointercancel", saatLepas, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", saatTekan);
      document.removeEventListener("pointermove", saatGeser);
      document.removeEventListener("pointerup", saatLepas);
      document.removeEventListener("pointercancel", saatLepas);
      hidup.forEach((el) => el.remove());
      hidup.clear();
      lapisan?.remove();
    };
  }, []);

  return null;
}
