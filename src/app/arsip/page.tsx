import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { IkonCari } from "@/components/Ikon";
import { DevotionCard } from "@/lib/types";
import { cakupanDari, grupKata, kataPencarian, kolomCari, polaFrasa, sanitize } from "@/lib/cari";


export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arsip Saat Teduh",
  description:
    "Cari saat teduh berdasarkan topik, ayat, bulan, atau tema — arsip harian Abbalove Palem.",
};

const MONTHS = [
  "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Batas hasil per halaman arsip/pencarian. Dinaikkan dari 60 (kata umum
// seperti "kasih" mencapai ratusan) lalu dari 800 (total published sudah
// 1.030 baris, sehingga arsip 2024 Jan–Agu tidak pernah tampil).
const BATAS_HASIL = 1200;

// PostgREST membatasi maksimum 1.000 baris per permintaan (limit yang lebih
// besar tetap dipotong 1.000 tanpa galat), jadi setiap kueri diambil per
// halaman lalu disambung.
const HALAMAN = 1000;

// Batas aman query ringan (devotion_date + theme) — dipakai untuk daftar
// tahun/bulan, daftar tema, dan tema tiap bulan. Harus mencakup SEMUA baris
// published, bukan 500 terbaru seperti sebelumnya.
const BATAS_RINGKAS = 20000;

// Satu bulan paling banyak 31 baris, jadi satu permintaan (maks 1.000) cukup.
const BATAS_BULAN = 1000;

type Hasil<T> = { data: T[] | null; error?: unknown };

// Ambil semua baris dengan penyambungan halaman + satu percobaan ulang per
// halaman bila permintaan gagal (mis. hiccup singkat ke Supabase).
async function ambilSemua<T>(
  bikin: (dari: number, sampai: number) => PromiseLike<Hasil<T>>,
  batas: number
): Promise<{ data: T[]; error: boolean }> {
  const keluaran: T[] = [];
  let galat = false;
  for (let dari = 0; dari < batas; dari += HALAMAN) {
    const sampai = Math.min(dari + HALAMAN, batas) - 1;
    let r = await bikin(dari, sampai);
    if (r.error) r = await bikin(dari, sampai);
    if (r.error) {
      galat = true;
      break;
    }
    const d = r.data ?? [];
    keluaran.push(...d);
    if (d.length < sampai - dari + 1) break;
  }
  return { data: keluaran, error: galat };
}

function bulanDari(ym: string): string {
  return `${MONTHS[parseInt(ym.slice(5))]} ${ym.slice(0, 4)}`;
}

function dua(n: number): string {
  return String(n).padStart(2, "0");
}

// Hierarki arsip (rancangan Jo, 12 Nov 2026 — menggantikan daftar 1.030 kartu):
//   /arsip                → pilih tahun saja
//   /arsip?tahun=2024     → pilih bulan (dengan jumlah & tema)
//   /arsip?bulan=2024-03  → daftar judul tanggal 1 … akhir bulan
//   /arsip?cari=…         → hasil pencarian langsung, TANPA melewati dua langkah
//   /arsip?tema=…         → hasil filter tema
// ?bulan tanpa ?tahun tetap dilayani (tautan lama kartu tema/bulan).
type Mode = "cari" | "bulan" | "tema" | "pilih-bulan" | "pilih-tahun";

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{
    bulan?: string;
    tahun?: string;
    tema?: string;
    cari?: string;
    di?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const cari = sanitize(sp.cari ?? "");
  const cakupan = cakupanDari(sp.di);
  const kolom = kolomCari(cakupan);
  const hanyaJudul = cakupan === "judul";

  const tahun = sp.tahun && /^\d{4}$/.test(sp.tahun) ? sp.tahun : "";
  const bulan = sp.bulan && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : "";
  const tema = sp.tema ?? "";

  const mode: Mode = cari
    ? "cari"
    : bulan
      ? "bulan"
      : tema
        ? "tema"
        : tahun
          ? "pilih-bulan"
          : "pilih-tahun";
  const modeHasil = mode === "cari" || mode === "bulan" || mode === "tema";

  // Kueri dasar: filter bulan/tema + urut tanggal terbaru.
  // Tanpa .limit() — jatah baris datang dari .range() di ambilSemua().
  const kueriDasar = () => {
    let q = supabase
      .from("devotions")
      .select(
        "slug, devotion_date, title, summary, theme, hearts_count"
      )
      .eq("status", "published")
      .order("devotion_date", { ascending: false });

    if (bulan) {
      q = q.gte("devotion_date", `${bulan}-01`).lt(
        "devotion_date",
        bulan.endsWith("-12")
          ? `${parseInt(bulan.slice(0, 4)) + 1}-01-01`
          : `${bulan.slice(0, 4)}-${dua(parseInt(bulan.slice(5)) + 1)}-01`
      );
    }
    if (tema) q = q.eq("theme", tema);
    return q;
  };

  const pola = cari ? polaFrasa(cari) : [];
  const kata = cari ? kataPencarian(cari) : [];

  // Kueri kartu (hanya pada mode hasil) + query ringan (daftar tahun/bulan,
  // tema, daftar tema untuk filter) dijalankan berbarean.
  const [hasilKartu, ringkas] = await Promise.all([
    (async (): Promise<{
      devotions: DevotionCard[];
      longgar: boolean;
      galat: boolean;
    }> => {
      if (!modeHasil) return { devotions: [], longgar: false, galat: false };
      let longgar = false;
      let galat = false;
      let devotions: DevotionCard[] = [];

      if (mode === "cari" && pola.length > 0) {
        const flat = pola
          .flatMap((p) => kolom.map((c) => `${c}.ilike.*${p}*`))
          .join(",");
        const r = await ambilSemua<DevotionCard>(
          (dari, sampai) => kueriDasar().or(flat).range(dari, sampai),
          BATAS_HASIL
        );
        if (r.error) galat = true;
        devotions = r.data;
      }

      if (mode === "cari" && devotions.length === 0 && kata.length > 1) {
        const bikinKata = (dari: number, sampai: number) => {
          let q2 = kueriDasar();
          for (const k of kata) q2 = q2.or(grupKata(k, kolom));
          return q2.range(dari, sampai);
        };
        const r2 = await ambilSemua<DevotionCard>(bikinKata, BATAS_HASIL);
        if (r2.error) galat = true;
        devotions = r2.data;
        longgar = !r2.error && r2.data.length > 0;
      }

      if (mode !== "cari") {
        const batas = mode === "bulan" ? BATAS_BULAN : BATAS_HASIL;
        const r = await ambilSemua<DevotionCard>(
          (dari, sampai) => kueriDasar().range(dari, sampai),
          batas
        );
        if (r.error) galat = true;
        devotions = r.data;
        // Daftar bulan dibaca menurut tanggal naik: 1 … akhir bulan.
        if (mode === "bulan") {
          devotions.sort(
            (a, b) =>
              a.devotion_date.localeCompare(b.devotion_date) ||
              a.slug.localeCompare(b.slug)
          );
        }
      }

      return { devotions, longgar, galat };
    })(),
    // Query ringan (hanya devotion_date + theme) TANPA batas 500 — dulu batas
    // itu membuat tahun 2024 dan topik bulan 2024 tidak pernah muncul.
    ambilSemua<{ devotion_date: string; theme: string | null }>(
      (dari, sampai) =>
        supabase
          .from("devotions")
          .select("devotion_date, theme")
          .eq("status", "published")
          .order("devotion_date", { ascending: false })
          .order("slug", { ascending: true })
          .range(dari, sampai),
      BATAS_RINGKAS
    ),
  ]);

  const devotions = hasilKartu.devotions;
  const longgar = hasilKartu.longgar;
  const galatPencarian = hasilKartu.galat;
  const opsi = ringkas.data;

  // Hitung per tahun & per bulan + tema paling sering tiap bulan.
  const hitungTahun = new Map<string, number>();
  const hitungBulan = new Map<string, number>();
  const temaBulan = new Map<string, Map<string, number>>();
  const themeSet = new Set<string>();
  for (const d of opsi) {
    const y = d.devotion_date.slice(0, 4);
    const ym = d.devotion_date.slice(0, 7);
    hitungTahun.set(y, (hitungTahun.get(y) ?? 0) + 1);
    hitungBulan.set(ym, (hitungBulan.get(ym) ?? 0) + 1);
    if (d.theme) {
      themeSet.add(d.theme);
      let m = temaBulan.get(ym);
      if (!m) {
        m = new Map<string, number>();
        temaBulan.set(ym, m);
      }
      m.set(d.theme, (m.get(d.theme) ?? 0) + 1);
    }
  }
  const daftarTahun = [...hitungTahun.keys()].sort().reverse();
  const themeList = [...themeSet].sort();
  const temaTeratas = (ym: string): string | null => {
    const m = temaBulan.get(ym);
    if (!m) return null;
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };

  // Opsi bulan untuk halaman pilih-bulan (12 bulan + jumlah + tema).
  const opsiBulan = tahun
    ? MONTHS.slice(1).map((label, i) => {
        const ym = `${tahun}-${dua(i + 1)}`;
        return {
          ym,
          label,
          n: hitungBulan.get(ym) ?? 0,
          tema: temaTeratas(ym),
        };
      })
    : [];

  // Kelompokkan hasil per bulan (mode cari/tema) untuk penanda tema bulan.
  type Grup = { ym: string; label: string; theme: string | null; items: DevotionCard[] };
  const grup: Grup[] = [];
  for (const d of devotions) {
    const ym = d.devotion_date.slice(0, 7);
    let g = grup[grup.length - 1];
    if (!g || g.ym !== ym) {
      g = { ym, label: bulanDari(ym), theme: null, items: [] };
      grup.push(g);
    }
    g.items.push(d);
  }
  for (const g of grup) {
    const hitung = new Map<string, number>();
    for (const d of g.items)
      if (d.theme) hitung.set(d.theme, (hitung.get(d.theme) ?? 0) + 1);
    g.theme =
      [...hitung.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  }

  // Tahun tempat halaman bulan berasal (dipakai tombol kembali).
  const tahunDariBulan = bulan ? bulan.slice(0, 4) : tahun;
  const temaBulanIni = bulan ? temaTeratas(bulan) : null;
  const adaReset = modeHasil && !!(cari || bulan || tema);

  return (
    <div
      className={`mx-auto max-w-3xl px-4 ${mode === "cari" ? "py-4 sm:py-6" : "py-10 sm:py-14"}`}
    >
      {/* Kepala halaman per mode — saat mencari, tampil ringkas supaya kartu
          hasil langsung terlihat tanpa menggulir (dulu header besar mendorong
          kartu ke luar layar HP). */}
      {mode === "cari" ? (
        <h1 className="judul-rapat-sm text-[20px] text-plum sm:text-[24px]">
          Hasil pencarian “{cari}”
        </h1>
      ) : mode === "pilih-tahun" ? (
        <>
          <p className="label-kecil text-ungu">Arsip</p>
          <h1 className="judul-rapat-sm mt-2 text-[32px] text-plum sm:text-[40px]">
            Semua saat teduh
          </h1>
          <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-tinta-2">
            Cari berdasarkan topik atau ayat — mis. “jiwa”, “Matius 9”, atau
            “Yoh 3:16” (singkatan kitab dikenali) — atau pilih tahun, lalu
            bulan, untuk menelusuri arsip.
          </p>
        </>
      ) : mode === "pilih-bulan" ? (
        <>
          <Link
            href="/arsip"
            className="inline-flex min-h-9 items-center text-[14px] font-medium text-tinta-2 transition hover:text-ungu"
          >
            ← Semua tahun
          </Link>
          <p className="label-kecil mt-4 text-ungu">Arsip</p>
          <h1 className="judul-rapat-sm mt-1 text-[32px] text-plum sm:text-[40px]">
            {tahun}
          </h1>
          <p className="mt-1 text-[15px] text-tinta-2">
            {hitungTahun.get(tahun) ?? 0} saat teduh
          </p>
        </>
      ) : mode === "bulan" ? (
        <>
          <Link
            href={`/arsip?tahun=${tahunDariBulan}`}
            className="inline-flex min-h-9 items-center text-[14px] font-medium text-tinta-2 transition hover:text-ungu"
          >
            ← {tahunDariBulan}
          </Link>
          <p className="label-kecil mt-4 text-ungu">Arsip</p>
          <h1 className="judul-rapat-sm mt-1 text-[32px] text-plum sm:text-[40px]">
            {bulanDari(bulan)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <span className="text-[15px] text-tinta-2">
              {devotions.length} saat teduh
            </span>
            {temaBulanIni && (
              <Link
                href={`/arsip?tema=${encodeURIComponent(temaBulanIni)}`}
                className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-ungu-2 transition hover:bg-ungu hover:text-white"
              >
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                Tema bulan: {temaBulanIni}
              </Link>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="label-kecil text-ungu">Arsip</p>
          <h1 className="judul-rapat-sm mt-2 text-[32px] text-plum sm:text-[40px]">
            Tema “{tema}”
          </h1>
        </>
      )}

      {/* Satu formulir untuk kata cari + bulan + tema: tombol mana pun yang
          ditekan membawa SELURUH isian, jadi kata pencarian tidak pernah hilang
          (dulu "Tampilkan" membuang ?cari). Pada halaman pilih tahun/bulan hanya
          kotak pencarian yang tampil — pilihan bulan/tema lewat langkah berikutnya. */}
      <form method="GET" action="/arsip" className={mode === "cari" ? "mt-2" : "mt-7"}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-tinta-2"
            >
              <IkonCari className="h-[18px] w-[18px]" />
            </span>
            <input
              type="search"
              name="cari"
              defaultValue={sp.cari ?? ""}
              placeholder={
                hanyaJudul
                  ? "Cari di judul saja… (mis. “doa”)"
                  : "Cari topik atau ayat… (mis. “Yoh 3:16”)"
              }
              className="min-h-12 w-full rounded-full border border-garis bg-kertas pl-11 pr-24 py-3 text-[15px] text-tinta shadow-kartu placeholder:text-tinta-3 focus:border-ungu/50 focus:outline-none"
              aria-label="Cari topik atau ayat"
            />
            {/* Cakupan: dicentang = judul saja; tidak dicentang = judul + isi */}
            <label className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 cursor-pointer items-center gap-1.5 rounded-full px-1.5 py-1 text-[12px] font-medium text-tinta-2 transition select-none hover:text-ungu">
              <input
                type="checkbox"
                name="di"
                value="judul"
                defaultChecked={hanyaJudul}
                className="h-3.5 w-3.5 accent-[#6C3483]"
              />
              judul saja
            </label>
          </div>
          <button type="submit" className="btn btn-utama shrink-0 px-5">
            <IkonCari className="h-4 w-4" />
            Cari
          </button>
        </div>

        {modeHasil && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              name="bulan"
              defaultValue={sp.bulan ?? ""}
              className="min-h-11 flex-1 rounded-xl border border-garis bg-kertas px-3 py-2 text-[14px] text-tinta shadow-[0_1px_2px_rgba(31,27,24,0.04)] focus:border-ungu/50 focus:outline-none"
              aria-label="Bulan"
            >
              <option value="">Semua bulan</option>
              {daftarTahun.flatMap((y) =>
                MONTHS.slice(1).map((mn, i) => (
                  <option key={`${y}-${i}`} value={`${y}-${dua(i + 1)}`}>
                    {mn} {y}
                  </option>
                ))
              )}
            </select>
            <select
              name="tema"
              defaultValue={sp.tema ?? ""}
              className="min-h-11 flex-1 rounded-xl border border-garis bg-kertas px-3 py-2 text-[14px] text-tinta shadow-[0_1px_2px_rgba(31,27,24,0.04)] focus:border-ungu/50 focus:outline-none"
              aria-label="Tema"
            >
              <option value="">Semua tema</option>
              {themeList.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn-halus shrink-0 px-4">
              Tampilkan
            </button>
            {adaReset && (
              <Link
                href="/arsip"
                className="flex min-h-11 items-center rounded-xl px-3 py-2 text-[14px] font-medium text-tinta-3 transition hover:text-ungu"
              >
                Reset
              </Link>
            )}
          </div>
        )}
      </form>

      {/* Pilih tahun — hanya kartu tahun, tanpa daftar judul & tanpa semua
          bulan sekaligus (inilah yang diminta Jo, 12 Nov 2026). */}
      {mode === "pilih-tahun" && (
        <>
          <h2 className="sr-only">Pilih tahun</h2>
          <section className="mt-7 grid gap-3 sm:grid-cols-3">
            {daftarTahun.map((y) => (
              <Link
                key={y}
                href={`/arsip?tahun=${y}`}
                className="kartu kartu-naik flex items-baseline justify-between gap-3 p-4 sm:flex-col sm:items-start sm:gap-1 sm:p-5"
              >
                <span className="judul-rapat-sm text-[22px] leading-none text-plum sm:text-[26px]">
                  {y}
                </span>
                <span className="text-[14.5px] text-tinta-2">
                  {hitungTahun.get(y) ?? 0} saat teduh
                </span>
              </Link>
            ))}
          </section>
        </>
      )}

      {/* Pilih bulan — 12 bulan tahun itu, lengkap dengan jumlah & tema. */}
      {mode === "pilih-bulan" && (
        <>
          <h2 className="sr-only">Pilih bulan</h2>
          <section className="mt-6 grid gap-3 sm:grid-cols-2">
            {opsiBulan.map((o) => (
              <Link
                key={o.ym}
                href={`/arsip?tahun=${tahun}&bulan=${o.ym}`}
                className={`kartu kartu-naik flex items-center justify-between gap-3 p-4 ${
                  o.n === 0 ? "opacity-60" : ""
                }`}
              >
                <span>
                  <span className="judul-rapat-sm block text-[18px] text-plum">
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-tinta-3">
                    {o.n} saat teduh
                  </span>
                </span>
                {o.tema && (
                  <span className="inline-flex max-w-[55%] items-center gap-1.5 rounded-full bg-lavender px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.02em] text-ungu-2">
                    <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                    <span className="truncate">{o.tema}</span>
                  </span>
                )}
              </Link>
            ))}
          </section>
        </>
      )}

      {/* Ringkasan hasil pencarian & filter tema (halaman bulan sudah punya
          hitungan di kepala halaman). */}
      {(mode === "cari" || mode === "tema") && (
        <p className={`${mode === "cari" ? "mt-3" : "mt-8"} text-[14.5px] text-tinta-2`}>
          <strong className="font-semibold text-tinta">
            {devotions.length}
          </strong>{" "}
          saat teduh {cari ? "ditemukan" : "cocok"}
          {cari && (
            <>
              {" "}
              untuk pencarian “{cari}”
            </>
          )}
          {hanyaJudul && cari && <> di judul</>}
          {devotions.length >= BATAS_HASIL && (
            <> — batas {BATAS_HASIL} tercapai, persempit pencarian.</>
          )}
        </p>
      )}
      {longgar && (
        <p className="mt-2 rounded-xl bg-lavender px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ungu-2">
          Hasil persis tidak ada — ini yang mendekati: kata-kata Anda
          ditemukan terpisah di dalam teks.
        </p>
      )}

      {/* Hasil — mode bulan: daftar judul urut tanggal 1 … akhir bulan;
          mode cari/tema: dikelompokkan per bulan dengan tema bulan. */}
      {modeHasil && (
        <div
          id="hasil"
          className={`${mode === "cari" ? "mt-3" : "mt-6"} scroll-mt-24 space-y-10`}
        >
          {mode === "bulan" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {devotions.map((d) => (
                <DevotionCardItem key={d.slug} d={d} />
              ))}
            </div>
          ) : (
            grup.map((g) => (
              <section key={g.ym}>
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-garis pb-3">
                  <div>
                    <h2 className="judul-rapat-sm text-[20px] text-plum">{g.label}</h2>
                    <p className="mt-1 text-[12.5px] text-tinta-3">
                      {g.items.length} edisi
                    </p>
                  </div>
                  {g.theme && (
                    <Link
                      href={`/arsip?tema=${encodeURIComponent(g.theme)}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1.5 text-[12px] font-semibold tracking-[0.02em] text-ungu-2 transition hover:bg-ungu hover:text-white"
                    >
                      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      Tema bulan: {g.theme}
                    </Link>
                  )}
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {g.items.map((d) => (
                    <DevotionCardItem key={d.slug} d={d} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      {modeHasil && galatPencarian && (
        <p className="kartu mt-8 border-dashed p-10 text-center text-[15px] text-tinta-2">
          Pencarian gagal dijalankan — server menolak permintaan. Coba lagi
          dengan istilah yang lebih sederhana.
        </p>
      )}
      {modeHasil && !galatPencarian && devotions.length === 0 && (
        <p className="kartu mt-8 border-dashed p-10 text-center text-[15px] text-tinta-2">
          Tidak ada saat teduh yang cocok
          {cari ? ` dengan kata “${cari}”` : " dengan filter ini"}.
        </p>
      )}
    </div>
  );
}
