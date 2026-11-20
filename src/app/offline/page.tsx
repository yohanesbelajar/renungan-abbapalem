import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tidak ada sinyal",
  description: "Halaman ini terbuka tanpa sambungan internet.",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <p className="label-kecil text-ungu">Luring</p>
      <h1 className="judul-rapat-sm mt-2 text-[28px] text-plum">Tidak ada sinyal</h1>
      <p className="mt-3 text-[15.5px] leading-relaxed text-tinta-2">
        Halaman ini belum tersimpan di perangkat. Saat teduh yang pernah Anda buka
        tetap bisa dibaca — coba kembali ke halaman itu, atau sambungkan internet
        lalu muat ulang.
      </p>
      <Link href="/" className="btn btn-utama mt-7">
        Coba beranda
      </Link>
    </div>
  );
}
