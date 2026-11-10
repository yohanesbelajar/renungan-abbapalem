import type { Metadata } from "next";
import Link from "next/link";
import { IkonPanah } from "@/components/Ikon";
import { SITE_NAME, VALUE_STATEMENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Tentang saat teduh harian Abbalove Palem — bagian dari keluarga besar Abbalove Ministries.",
};

const NILAI = [
  {
    t: "Firman setiap hari",
    d: "Satu edisi saat teduh untuk setiap tanggal, disusun berurutan dan bertopik per bulan.",
  },
  {
    t: "Mudah ditemukan kembali",
    d: "Arsip bisa dicari menurut topik maupun ayat, sehingga bahan lama tetap terpakai.",
  },
  {
    t: "Untuk jemaat dan siapa pun",
    d: "Dibagikan terbuka — jemaat Abbalove Palem maupun pembaca di tempat lain.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="label-kecil text-ungu">Tentang</p>
      <h1 className="judul-rapat mt-3 text-[30px] text-plum sm:text-[40px]">
        Saat teduh harian, terbuka untuk siapa saja.
      </h1>

      <div className="kartu mt-8 p-6 sm:p-8">
        <p className="text-[15px] font-semibold tracking-tight text-tinta">
          {SITE_NAME}
        </p>
        <div className="mt-4 space-y-3 text-[15.5px] leading-relaxed text-tinta-2">
          <p>
            Website ini adalah bagian dari keluarga besar Abbalove Ministries,
            berfokus pada pelayanan dan kehidupan rohani jemaat Abbalove Palem.
          </p>
          <p>
            Saat Teduh harian ini disusun oleh tim penulis saat teduh Abbalove
            Palem untuk menemani jemaat dan pembaca di mana pun berada: membaca
            firman, merenungkannya, dan menerapkannya dalam kehidupan
            sehari-hari.
          </p>
          <p>
            Landasan nilai kami:{" "}
            <strong className="font-semibold text-tinta">{VALUE_STATEMENT}</strong>
            . Kami percaya teknologi harus melayani pertumbuhan rohani.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {NILAI.map((n) => (
          <div key={n.t} className="kartu p-5">
            <p className="text-[14.5px] font-semibold tracking-tight text-tinta">
              {n.t}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-tinta-2">
              {n.d}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2">
        <section>
          <h2 className="judul-rapat-sm text-[18px] text-tinta">Kontak</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
            Untuk pertanyaan, saran, atau ingin bergabung dalam tim penulis,
            hubungi pengurus Abbalove Palem melalui sekretariat gereja.
          </p>
        </section>
        <section>
          <h2 className="judul-rapat-sm text-[18px] text-tinta">Kutipan Alkitab</h2>
          <p className="mt-2 text-[14.5px] leading-relaxed text-tinta-2">
            Kutipan Alkitab pada website ini dikutip dari ALKITAB (TB) © LAI
            1974.
          </p>
        </section>
      </div>

      <Link href="/arsip" className="btn btn-utama mt-10">
        Telusuri arsip <IkonPanah className="h-4 w-4" />
      </Link>
    </div>
  );
}
