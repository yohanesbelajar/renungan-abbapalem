import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import DevotionCardItem from "@/components/DevotionCardItem";
import { IkonCari } from "@/components/Ikon";
import { DevotionCard } from "@/lib/types";
import { KOL_CARI, grupKata, kataPencarian, polaFrasa, sanitize } from "@/lib/cari";


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

// Batas hasil per pencarian (total data terbit jauh di bawah ini;
// dinaikkan dari 60 karena kata umum seperti "kasih" mencapai ratusan)
const BATAS_HASIL = 800;

function bulanDari(ym: string): string {
  return `${MONTHS[parseInt(ym.slice(5))]} ${ym.slice(0, 4)}`;
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; tema?: string; cari?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const cari = sanitize(sp.cari ?? "");

  // Kueri dasar: filter bulan/tema + urut tanggal terbaru
  const kueriDasar = () => {
    let q = supabase
      .from("devotions")
      .select(
        "slug, devotion_date, title, summary, theme, hearts_count"
      )
      .eq("status", "published")
      .order("devotion_date", { ascending: false })
      .limit(BATAS_HASIL);

    if (sp.bulan && /^\d{4}-\d{2}$/.test(sp.bulan)) {
      q = q.gte("devotion_date", `${sp.bulan}-01`).lt(
        "devotion_date",
        sp.bulan.endsWith("-12")
          ? `${parseInt(sp.bulan.slice(0, 4)) + 1}-01-01`
          : `${sp.bulan.slice(0, 4)}-${String(parseInt(sp.bulan.slice(5)) + 1).padStart(2, "0")}-01`
      );
    }
    if (sp.tema) q = q.eq("theme", sp.tema);
    return q;
  };

  // Satu percobaan ulang bila permintaan gagal (mis. hiccup singkat ke
  // Supabase) — tanpa ini pengunjung melihat "tidak ada" padahal data ada.
  async function coba<T>(bikin: () => PromiseLike<T>): Promise<T> {
    let r = await bikin();
    if ((r as { error?: unknown }).error) r = await bikin();
    return r;
  }

  // Pencarian dua lapis (lihat src/lib/cari.ts):
  //  1. frasa + varian singkatan kitab & spasi angka
  //  2. bila frasa nol hasil → semua kata harus ditemukan (di kolom mana pun)
  const pola = cari ? polaFrasa(cari) : [];
  const kata = cari ? kataPencarian(cari) : [];
  let longgar = false;
  let galatPencarian = false;
  let devotions: DevotionCard[] | null = null;

  if (cari && pola.length > 0) {
    const flat = pola
      .flatMap((p) => KOL_CARI.map((c) => `${c}.ilike.*${p}*`))
      .join(",");
    const r = await coba(() => kueriDasar().or(flat));
    if (r.error) galatPencarian = true;
    devotions = (r.data as DevotionCard[] | null) ?? null;
  }

  if (cari && (devotions?.length ?? 0) === 0 && kata.length > 1) {
    const bikinKata = () => {
      let q2 = kueriDasar();
      for (const k of kata) q2 = q2.or(grupKata(k));
      return q2;
    };
    const r2 = await coba(bikinKata);
    if (r2.error) galatPencarian = true;
    devotions = (r2.data as DevotionCard[] | null) ?? null;
    longgar = !r2.error && (devotions?.length ?? 0) > 0;
  }

  if (!cari) {
    const r = await coba(kueriDasar);
    devotions = (r.data as DevotionCard[] | null) ?? null;
  }

  // Opsi filter: tahun-tahun yang ada + daftar tema + topik bulanan
  const { data: allPub } = await supabase
    .from("devotions")
    .select("devotion_date, theme")
    .eq("status", "published")
    .order("devotion_date", { ascending: false })
    .limit(500);

  const years = [
    ...new Set((allPub ?? []).map((d) => d.devotion_date.slice(0, 4))),
  ].sort((a, b) => b.localeCompare(a));
  const themeList = [
    ...new Set(
      (allPub ?? [])
        .map((d) => d.theme)
        .filter((t): t is string => !!t)
    ),
  ].sort();

  // Topik bulanan: tema menonjol per bulan (tema paling sering muncul)
  const bulanan = new Map<string, { label: string; theme: string | null }>();
  for (const d of allPub ?? []) {
    const ym = d.devotion_date.slice(0, 7);
    if (!bulanan.has(ym)) bulanan.set(ym, { label: bulanDari(ym), theme: null });
    if (d.theme && !bulanan.get(ym)!.theme) bulanan.get(ym)!.theme = d.theme;
  }
  const topikBulanan = [...bulanan.entries()].sort((a, b) =>
    b[0].localeCompare(a[0])
  );

  // Kelompokkan hasil per bulan untuk penanda tema bulan di arsip
  type Grup = { ym: string; label: string; theme: string | null; items: DevotionCard[] };
  const grup: Grup[] = [];
  for (const d of (devotions ?? []) as DevotionCard[]) {
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

  const adaFilter = !!(sp.bulan || sp.tema || sp.cari);

  return (
    <div className={`mx-auto max-w-3xl px-4 ${cari ? "py-4 sm:py-6" : "py-10 sm:py-14"}`}>
      {/* Kepala halaman — saat mencari, tampil ringkas supaya kartu hasil
          langsung terlihat tanpa menggulir (dulu header besar mendorong
          kartu ke luar layar HP). */}
      {cari ? (
        <h1 className="judul-rapat-sm text-[20px] text-plum sm:text-[24px]">
          Hasil pencarian “{cari}”
        </h1>
      ) : (
        <>
          <p className="label-kecil text-ungu">Arsip</p>
          <h1 className="judul-rapat-sm mt-2 text-[32px] text-plum sm:text-[40px]">
            Semua saat teduh
          </h1>
        </>
      )}
      {!cari && (
        <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-tinta-2">
          Cari berdasarkan topik atau ayat — mis. “jiwa”, “Matius 9”, atau “Yoh
          3:16” (singkatan kitab dikenali) — atau telusuri menurut bulan dan
          tema.
        </p>
      )}

      {/* Satu formulir untuk kata cari + bulan + tema: tombol mana pun yang
          ditekan membawa SELURUH isian, jadi kata pencarian tidak pernah hilang
          (dulu "Tampilkan" membuang ?cari). */}
      <form method="GET" action="/arsip" className={cari ? "mt-2" : "mt-7"}>
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
              placeholder="Cari topik atau ayat… (mis. “Yoh 3:16”)"
              className="min-h-12 w-full rounded-full border border-garis bg-kertas pl-11 pr-4 py-3 text-[15px] text-tinta shadow-kartu placeholder:text-tinta-3 focus:border-ungu/50 focus:outline-none"
              aria-label="Cari topik atau ayat"
            />
          </div>
          <button type="submit" className="btn btn-utama shrink-0 px-5">
            <IkonCari className="h-4 w-4" />
            Cari
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <select
            name="bulan"
            defaultValue={sp.bulan ?? ""}
            className="min-h-11 flex-1 rounded-xl border border-garis bg-kertas px-3 py-2 text-[14px] text-tinta shadow-[0_1px_2px_rgba(31,27,24,0.04)] focus:border-ungu/50 focus:outline-none"
            aria-label="Bulan"
          >
            <option value="">Semua bulan</option>
            {years.flatMap((y) =>
              MONTHS.slice(1).map((mn, i) => (
                <option key={`${y}-${i}`} value={`${y}-${String(i + 1).padStart(2, "0")}`}>
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
          {adaFilter && (
            <Link
              href="/arsip"
              className="flex min-h-11 items-center rounded-xl px-3 py-2 text-[14px] font-medium text-tinta-3 transition hover:text-ungu"
            >
              Reset
            </Link>
          )}
        </div>
      </form>

      {/* Topik bulanan menonjol — disembunyikan saat mencari supaya kartu hasil
          langsung terlihat (dulu blok ini mendorong hasil ke luar layar HP). */}
      {!cari && !sp.bulan && topikBulanan.length > 0 && (
        <section className="mt-8">
          <h2 className="label-kecil text-tinta-3">Topik tiap bulan</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {topikBulanan.map(([ym, v]) => (
              <Link
                key={ym}
                href={`/arsip?bulan=${ym}`}
                className="group inline-flex items-center gap-2 rounded-full border border-garis bg-kertas py-1.5 pl-3 pr-3.5 text-[13.5px] shadow-[0_1px_2px_rgba(31,27,24,0.04)] transition hover:border-ungu/35 hover:bg-ungu-lembut"
              >
                <span className="font-semibold text-tinta">{v.label}</span>
                {v.theme && (
                  <>
                    <span aria-hidden className="text-tinta-3">·</span>
                    <span className="font-semibold text-ungu transition group-hover:text-ungu-tua">
                      {v.theme}
                    </span>
                  </>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Ringkasan hasil pencarian */}
      {adaFilter && (
        <p className={`${cari ? "mt-3" : "mt-8"} text-[14.5px] text-tinta-2`}>
          <strong className="font-semibold text-tinta">
            {devotions?.length ?? 0}
          </strong>{" "}
          saat teduh {cari ? "ditemukan" : "cocok"}
          {cari && (
            <>
              {" "}
              untuk pencarian “{cari}”
            </>
          )}
          {(devotions?.length ?? 0) >= BATAS_HASIL && (
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

      {/* Hasil, dikelompokkan per bulan dengan tema bulan */}
      <div id="hasil" className={`${cari ? "mt-3" : "mt-6"} scroll-mt-24 space-y-10`}>

        {grup.map((g) => (
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
        ))}
      </div>

      {galatPencarian && (
        <p className="kartu mt-8 border-dashed p-10 text-center text-[15px] text-tinta-2">
          Pencarian gagal dijalankan — server menolak permintaan. Coba lagi
          dengan istilah yang lebih sederhana.
        </p>
      )}
      {!galatPencarian && (!devotions || devotions.length === 0) && (
        <p className="kartu mt-8 border-dashed p-10 text-center text-[15px] text-tinta-2">
          Tidak ada saat teduh yang cocok
          {cari ? ` dengan kata “${cari}”` : " dengan filter ini"}.
        </p>
      )}
    </div>
  );
}
