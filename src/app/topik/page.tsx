import Link from "next/link";
import type { Metadata } from "next";
import { semuaTerbit } from "@/lib/publik";
import { kelompokTema } from "@/lib/topik";

export const metadata: Metadata = {
  title: "Topik saat teduh",
  description:
    "Semua topik bulanan saat teduh Abbalove Palem — dari jiwa-jiwa, doa, sampai pengharapan. Pilih topik untuk membaca seluruh edisinya.",
  alternates: { canonical: "/topik" },
};

export const revalidate = 1800;

export default async function DaftarTopikPage() {
  const topik = kelompokTema(await semuaTerbit());

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="label-kecil text-ungu">Topik</p>
      <h1 className="judul-rapat-sm mt-2 text-[32px] text-plum sm:text-[40px]">
        Saat teduh menurut topik
      </h1>
      <p className="mt-3 max-w-xl text-[15.5px] leading-relaxed text-tinta-2">
        Setiap bulan punya satu tema. Pilih topik di bawah untuk membaca semua
        edisinya — dari yang terbaru sampai yang paling awal.
      </p>

      <ul className="mt-8 divide-y divide-garis-tipis border-y border-garis-tipis">
        {topik.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topik/${t.slug}`}
              className="group flex items-center justify-between gap-4 py-3.5 transition"
            >
              <span className="min-w-0">
                <span className="block truncate text-[17px] font-semibold text-plum transition group-hover:text-ungu">
                  {t.tema}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-tinta-3">
                  {t.tahun.join(" · ")}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-lavender px-2.5 py-1 text-[12px] font-semibold text-ungu-2">
                {t.n} edisi
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {topik.length === 0 && (
        <p className="kartu mt-8 border-dashed p-10 text-center text-[15px] text-tinta-2">
          Belum ada tema yang tercatat.
        </p>
      )}
    </div>
  );
}
