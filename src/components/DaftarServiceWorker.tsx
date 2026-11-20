"use client";

import { useEffect } from "react";

// Mendaftarkan service worker (/sw.js) setelah halaman tenang, supaya tidak
// bersaing dengan pemuatan awal. Hanya di produksi dan hanya di HTTPS/localhost.
export default function DaftarServiceWorker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const aman = location.protocol === "https:" || location.hostname === "localhost";
    if (!aman) return;
    const daftar = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    };
    if (document.readyState === "complete") daftar();
    else window.addEventListener("load", daftar, { once: true });
  }, []);
  return null;
}
