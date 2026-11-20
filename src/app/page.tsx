import Link from "next/link";
import DevotionCardItem from "@/components/DevotionCardItem";
import { IkonBuku, IkonPanah } from "@/components/Ikon";
import { todayJakarta, formatTanggalID } from "@/lib/dates";
import { SITE_NAME, VALUE_STATEMENT } from "@/lib/constants";
import { dataBeranda } from "@/lib/beranda";
import { semuaTerbit } from "@/lib/publik";
import { kelompokTema } from "@/lib/topik";

// Beranda kini memakai data ter-cache (lib/beranda.ts). Dulu force-dynamic:
// tiap kunjungan menembak Supabase tiga kali, TTFB 1,24 s.
export const revalidate = 300;

const BULAN_PANJANG = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export default async function HomePage() {
  const today = todayJakarta();
  const [{ hariIni, terbaru, arsip }, topik] = await Promise.all([
    dataBeranda(today),
    semuaTerbit().then((baris) => kelompokTema(baris).slice(0, 6)),
  ]);

  const archive = arsip;
  const featured = hariIni ?? terbaru ?? null;
  // Label bulan mengikuti edisi terbaru yang benar-benar terbit, bukan tanggal hari ini
  const acuan = featured?.devotion_date ?? archive?.[0]?.devotion_date ?? today;
  const bulanIni = `${BULAN_PANJANG[Number(acuan.slice(5, 7))]} ${acuan.slice(0, 4)}`;

  return (
    <div>
      {/* ============ HERO ============
          Acuan warna dari banner: ungu keluarga Abbalove + jingga/amber matahari
          terbit di laut. Latar lavender→krem, pendar jingga di kanan atas. */}
      <section className="relative overflow-hidden border-b border-garis-tipis">
        <div
          aria-hidden
          className="hero-pendar pointer-events-none absolute inset-0 bg-[radial-gradient(90%_75%_at_10%_-8%,#efe2f7_0%,rgba(253,249,243,0)_62%),radial-gradient(72%_65%_at_90%_-2%,#fbe4c4_0%,rgba(253,249,243,0)_64%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-28 top-28 h-72 w-72 rounded-full bg-ungu/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-10 h-56 w-56 rounded-full bg-senja/15 blur-3xl"
        />

        <div className="relative mx-auto max-w-5xl px-4 pb-14 pt-14 sm:pb-16 sm:pt-20">
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-kecil inline-flex items-center gap-2 rounded-full border border-garis bg-kertas/85 px-3 py-1.5 text-plum shadow-[0_1px_2px_rgba(74,35,82,0.06)] backdrop-blur">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-senja" />
              {SITE_NAME}
            </p>

            {/* Judul: ungu plum, bukan tinta hitam — warna yang memimpin halaman */}
            <h1 className="judul-rapat mt-6 text-[36px] text-plum sm:text-[52px] lg:text-[62px]">
              Berjalan bersama Tuhan,
              <br className="hidden sm:block" />{" "}
              <span className="relative inline-block">
                <span className="bg-[linear-gradient(100deg,#963296_0%,#7a2679_58%,#6b2a55_100%)] bg-clip-text text-transparent">
                  setiap hari.
                </span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 -bottom-2 h-[5px] rounded-full bg-[linear-gradient(90deg,rgba(247,194,116,0)_0%,rgba(224,138,0,0.45)_50%,rgba(247,194,116,0)_100%)]"
                />
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-tinta-2 sm:text-[17.5px]">
              Satu saat teduh setiap hari untuk jemaat Abbalove Palem dan pembaca
              di semua tempat. Cari menurut topik atau ayat, kapan saja.
            </p>

            <div className="mx-auto mt-9 flex max-w-md flex-col gap-4 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
              {featured && (
                <Link
                  href={`/saat-teduh/${featured.slug}`}
                  className="btn btn-utama w-full sm:w-auto"
                >
                  <span>Baca saat teduh hari ini</span>
                  <IkonPanah className="h-4 w-4" />
                </Link>
              )}
              <Link href="/arsip" className="btn btn-sekunder w-full sm:w-auto">
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-full bg-lavender text-ungu"
                >
                  <IkonBuku className="h-3.5 w-3.5" />
                </span>
                Telusuri arsip
              </Link>
            </div>

            {/* Satu baris edisi hari ini — bukan kartu, bukan pengulangan arsip */}
            {featured && (
              <Link
                href={`/saat-teduh/${featured.slug}`}
                className="group mx-auto mt-8 inline-flex max-w-2xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 text-[14px] text-tinta-2 transition hover:text-plum"
              >
                <span className="label-kecil rounded-full bg-senja/15 px-2 py-1 text-[#7a4a10]">
                  {hariIni ? "Hari ini" : "Terbaru"}
                </span>
                <span>{formatTanggalID(featured.devotion_date)}</span>
                {featured.theme && (
                  <>
                    <span aria-hidden className="text-tinta-3">·</span>
                    <span className="font-semibold text-ungu">{featured.theme}</span>
                  </>
                )}
                <span className="font-semibold text-plum underline decoration-garis underline-offset-4 group-hover:decoration-ungu/50">
                  {featured.title}
                </span>
              </Link>
            )}

            <p className="mt-5 text-[13px] font-medium tracking-[0.04em] text-ungu-2">
              {VALUE_STATEMENT}
            </p>
          </div>
        </div>
      </section>

      {/* ============ ARSIP TERBARU ============ */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-kecil text-ungu">Arsip</p>
            <h2 className="judul-rapat-sm mt-2 text-[25px] text-plum sm:text-[31px]">
              Saat teduh terbaru
            </h2>
            <p className="mt-2 text-[15px] text-tinta-2">
              Edisi {bulanIni} dan sebelumnya.
            </p>
          </div>
          <Link href="/arsip" className="btn btn-halus btn-sm">
            Lihat semua
            <IkonPanah className="h-3.5 w-3.5" />
          </Link>
        </div>

        {archive && archive.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {archive.map((d) => (
              <DevotionCardItem key={d.slug} d={d} />
            ))}
          </div>
        ) : (
          <p className="kartu mt-8 p-8 text-center text-[15px] text-tinta-2">
            Arsip masih kosong. Saat Teduh yang diterbitkan akan tampil di sini.
          </p>
        )}

        {/* Pintu masuk per topik — jalur cepat ke tema bulanan, sekaligus
            jalur masuk dari mesin pencari (halaman /topik diindeks). */}
        {topik.length > 0 && (
          <div className="mt-12 border-t border-garis-tipis pt-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h3 className="judul-rapat-sm text-[17px] text-plum">Jelajahi menurut topik</h3>
              <Link
                href="/topik"
                className="text-[13.5px] font-semibold text-ungu hover:underline"
              >
                Semua topik
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {topik.map((t) => (
                <Link
                  key={t.slug}
                  href={`/topik/${t.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-garis bg-kertas px-3 py-1.5 text-[13px] font-semibold text-ungu-2 transition hover:border-ungu/40 hover:bg-lavender"
                >
                  {t.tema}
                  <span className="text-[11.5px] font-medium text-tinta-3">{t.n}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
