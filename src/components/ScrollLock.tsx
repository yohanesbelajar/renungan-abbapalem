"use client";

import { useEffect } from "react";

/* Membekukan gulir selama fallback loading tampil.
   Dipakai di dalam app/loading.tsx — hidup selama halaman baru dimuat. */
export default function ScrollLock() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return null;
}
