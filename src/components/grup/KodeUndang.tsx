"use client";

import { useState } from "react";

// Menampilkan kode undangan grup dengan tombol salin.
export default function KodeUndang({ kode }: { kode: string }) {
  const [tersalin, setTersalin] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(kode);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }

  return (
    <div className="rounded-2xl border border-garis-tipis bg-lavender px-4 py-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta-3">
        Kode undangan
      </p>
      <p className="font-mono text-lg font-bold tracking-widest text-plum">
        {kode}
      </p>
      <button
        type="button"
        onClick={salin}
        className="mt-1 text-xs font-medium text-ungu hover:underline"
      >
        {tersalin ? "Tersalin ✓" : "Salin kode"}
      </button>
    </div>
  );
}
