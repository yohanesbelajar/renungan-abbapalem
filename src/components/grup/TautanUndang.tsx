"use client";

import { useEffect, useState } from "react";

// Kotak tautan undangan grup — hanya ditampilkan untuk admin/pemilik.
// Tautan dibangun dari alamat situs yang sedang dibuka (preview atau live).
export default function TautanUndang({ kode }: { kode: string }) {
  const [asal, setAsal] = useState("");
  const [tersalin, setTersalin] = useState(false);

  useEffect(() => {
    setAsal(window.location.origin);
  }, []);

  const tautan = `${asal}/grup/gabung/${kode}`;

  async function salin() {
    try {
      await navigator.clipboard.writeText(tautan || `/grup/gabung/${kode}`);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      setTersalin(false);
    }
  }

  return (
    <div
      data-tautan-undangan
      className="rounded-2xl border border-garis-tipis bg-lavender px-4 py-3"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta-3">
        Tautan undangan (khusus admin)
      </p>
      <p className="mt-1 break-all font-mono text-sm font-semibold text-plum">
        {tautan || `/grup/gabung/${kode}`}
      </p>
      <div className="mt-2 flex gap-3">
        <a
          href={`/grup/gabung/${kode}`}
          className="text-xs font-medium text-ungu hover:underline"
        >
          Buka tautan
        </a>
        <button
          type="button"
          onClick={salin}
          className="text-xs font-medium text-ungu hover:underline"
        >
          {tersalin ? "Tersalin ✓" : "Salin tautan"}
        </button>
      </div>
    </div>
  );
}
