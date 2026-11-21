// Data kartu arsip — di-cache per kombinasi filter. Halaman /arsip memakai
// klien anonim (tanpa cookie) sehingga hasilnya boleh disimpan.
//
// PENTING (21 Nov 2026): hasil pencarian umum DIBATASI per halaman. Dulu
// "iman" mengirim SELURUH 834 kartu = 2,17 MB HTML dalam satu respons, dan
// inilah penyebab pencarian terasa 4–9 s (bukan kueri database — kuerinya
// ~0,6–1 s). Sekarang satu halaman = PER_HALAMAN kartu (~160 KB), sisanya
// lewat tautan "Berikutnya". Total sebenarnya tetap dihitung (count) supaya
// pengunjung tahu ada berapa hasil.
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";
import { grupKata, kataPencarian, kolomCari, polaFrasa, type Cakupan } from "./cari";
import type { DevotionCard } from "./types";

export const PER_HALAMAN = 60;
const BATAS_BULAN = 1000;

const KOLOM = "slug, devotion_date, title, theme, hearts_count";

function bulanBerikut(ym: string): string {
  const y = parseInt(ym.slice(0, 4), 10);
  const m = parseInt(ym.slice(5, 7), 10);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

export type PermintaanArsip = {
  cari: string;
  cakupan: Cakupan;
  tahun: string;
  bulan: string;
  tema: string;
  /** Halaman ke-1, ke-2, … (1-based). Diabaikan untuk mode bulan. */
  hal?: number;
};

export type HasilArsip = {
  devotions: DevotionCard[];
  longgar: boolean;
  galat: boolean;
  /** Jumlah sebenarnya seluruh hasil yang cocok (bukan hanya halaman ini). */
  total: number;
};

async function kueri(p: PermintaanArsip): Promise<HasilArsip> {
  const { cari, cakupan, bulan, tema } = p;
  const db = anonClient();
  const kolom = kolomCari(cakupan);
  const mode = cari ? "cari" : bulan ? "bulan" : tema ? "tema" : "pilih";
  if (mode === "pilih") return { devotions: [], longgar: false, galat: false, total: 0 };

  const dasar = () => {
    let q = db
      .from("devotions")
      .select(KOLOM, { count: "exact" })
      .eq("status", "published")
      .order("devotion_date", { ascending: false });
    if (bulan) q = q.gte("devotion_date", `${bulan}-01`).lt("devotion_date", bulanBerikut(bulan));
    if (tema) q = q.eq("theme", tema);
    return q;
  };

  const pola = cari ? polaFrasa(cari) : [];
  const kata = cari ? kataPencarian(cari) : [];
  let longgar = false;
  let galat = false;
  let devotions: DevotionCard[] = [];
  let total = 0;

  if (mode === "cari" && pola.length > 0) {
    const flat = pola.flatMap((f) => kolom.map((c) => `${c}.ilike.*${f}*`)).join(",");
    const hal = Math.max(1, p.hal ?? 1);
    const dari = (hal - 1) * PER_HALAMAN;
    const r = await dasar().or(flat).range(dari, dari + PER_HALAMAN - 1);
    if (r.error) galat = true;
    devotions = (r.data as DevotionCard[] | null) ?? [];
    total = r.count ?? devotions.length;
  }

  // Tidak ada hasil persis → coba setiap kata terpisah (mode "longgar").
  if (mode === "cari" && devotions.length === 0 && !galat && kata.length > 1) {
    let q2 = dasar();
    for (const k of kata) q2 = q2.or(grupKata(k, kolom));
    const r2 = await q2.range(0, PER_HALAMAN - 1);
    if (r2.error) galat = true;
    devotions = (r2.data as DevotionCard[] | null) ?? [];
    total = r2.count ?? devotions.length;
    longgar = !r2.error && devotions.length > 0;
  }

  if (mode === "bulan" || mode === "tema") {
    // Bulan maksimal 31 edisi; tema dibatasi per halaman seperti pencarian.
    const batas = mode === "bulan" ? BATAS_BULAN : PER_HALAMAN;
    const hal = Math.max(1, p.hal ?? 1);
    const dari = mode === "bulan" ? 0 : (hal - 1) * PER_HALAMAN;
    const r = await dasar().range(dari, dari + batas - 1);
    if (r.error) galat = true;
    devotions = (r.data as DevotionCard[] | null) ?? [];
    total = r.count ?? devotions.length;
    if (mode === "bulan") {
      devotions.sort(
        (a, b) => a.devotion_date.localeCompare(b.devotion_date) || a.slug.localeCompare(b.slug)
      );
    }
  }

  return { devotions, longgar, galat, total };
}

/** Kartu arsip, di-cache 5 menit per kombinasi filter (tag "devotions"). */
// Fungsi cache dibuat di tingkat modul, BUKAN di dalam handler: membuat
// unstable_cache baru pada setiap permintaan membuat entri cache tidak pernah
// dipakai ulang di Vercel (terukur: pencarian "doa" tetap 19–24 s tiap kali).
const kueriCache = unstable_cache(kueri, ["arsip"], {
  revalidate: 300,
  tags: ["devotions"],
});

export async function kartuArsip(p: PermintaanArsip): Promise<HasilArsip> {
  if (!p.cari && !p.bulan && !p.tema) {
    return { devotions: [], longgar: false, galat: false, total: 0 };
  }
  return kueriCache(p);
}
