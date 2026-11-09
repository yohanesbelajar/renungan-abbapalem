import type { Metadata } from "next";
import { SITE_NAME, VALUE_STATEMENT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Tentang",
  description:
    "Tentang renungan harian Abbalove Palem — bagian dari keluarga besar Abbalove Ministries.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Tentang</h1>
      <p className="mt-4 font-semibold text-[#2B4F8F]">{SITE_NAME}</p>
      <p className="mt-2">
        Website ini adalah bagian dari keluarga besar Abbalove Ministries,
        berfokus pada pelayanan dan kehidupan rohani jemaat Abbalove Palem.
      </p>
      <p className="mt-4">
        Landasan nilai kami: <strong>{VALUE_STATEMENT}</strong>. Kami percaya
        teknologi harus melayani pertumbuhan rohani — membantu setiap pembaca
        berjalan bersama Tuhan, setiap hari.
      </p>
      <p className="mt-4">
        Renungan harian ini disusun oleh tim penulis renungan Abbalove Palem
        untuk menemani jemaat dan pembaca di mana pun berada: membaca firman,
        merenungkannya, dan menerapkannya dalam kehidupan sehari-hari.
      </p>
      <p className="mt-4">
        Kutipan Alkitab pada website ini dikutip dari ALKITAB (TB) © LAI 1974.
      </p>
      <h2 className="mt-8 text-lg font-semibold text-slate-700">Kontak</h2>
      <p className="mt-2 text-sm text-slate-600">
        Untuk pertanyaan, saran, atau ingin bergabung dalam tim penulis,
        hubungi pengurus Abbalove Palem melalui sekretariat gereja.
      </p>
    </div>
  );
}
