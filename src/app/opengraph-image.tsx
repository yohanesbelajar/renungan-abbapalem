import { kartuEdisi } from "@/lib/og";

export const alt = "Saat Teduh Abbalove Palem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Kartu bawaan situs (beranda/arsip) — dipakai metadata openGraph di layout.
export default async function Image() {
  return kartuEdisi({
    judul: "Berjalan bersama Tuhan, setiap hari.",
    tema: null,
    tanggal: "Abbalove Palem",
  });
}
