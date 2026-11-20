// Pencatat kunjungan: satu tembakan ringan setelah halaman tampil, sekali per
// pengunjung per hari. Penanda "sudah dicatat" disimpan di localStorage; server
// tetap dedup lewat nama berkas, jadi penanda yang hilang tidak menggandakan angka.

"use client";

import { useEffect } from "react";

const KUNCI = "sate-pengunjung-tercatat";

function idPengunjung(): string | null {
  try {
    const lama = localStorage.getItem("sate-pengunjung-id");
    if (lama && /^[A-Za-z0-9-]{8,64}$/.test(lama)) return lama;
    const baru =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("sate-pengunjung-id", baru);
    return baru;
  } catch {
    return null;
  }
}

export default function PencatatKunjungan() {
  useEffect(() => {
    let batal = false;
    const jalan = () => {
      if (batal) return;
      try {
        // Halaman panel admin & auth tidak dihitung — angka = pembaca, bukan staf.
        if (/^\/(admin|masuk|daftar|auth)/.test(window.location.pathname)) return;
        const id = idPengunjung();
        if (!id) return;
        const cap = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Jakarta",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date());
        if (localStorage.getItem(KUNCI) === cap) return;
        const kirim = () => {
          fetch("/api/kunjungan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id }),
            keepalive: true,
          })
            .then((r) => {
              if (r.ok) localStorage.setItem(KUNCI, cap);
            })
            .catch(() => {});
        };
        if ("requestIdleCallback" in window) {
          (window as unknown as { requestIdleCallback: (f: () => void, o?: { timeout: number }) => void })
            .requestIdleCallback(kirim, { timeout: 3000 });
        } else {
          setTimeout(kirim, 1200);
        }
      } catch {
        // pencatat tidak boleh mengganggu pengunjung
      }
    };
    if (document.readyState === "complete") jalan();
    else window.addEventListener("load", jalan, { once: true });
    return () => {
      batal = true;
      window.removeEventListener("load", jalan);
    };
  }, []);

  return null;
}
