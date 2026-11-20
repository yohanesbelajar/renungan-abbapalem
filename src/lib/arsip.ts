// Data kartu arsip — di-cache per kombinasi filter. Halaman /arsip memakai
// klien anonim (tanpa cookie) sehingga hasilnya boleh disimpan; dulu halaman ini
// force-dynamic dan menembak Supabase ±2.000 baris pada SETIAP kunjungan
// (TTFB terukur 1,1–1,2 s).
import { unstable_cache } from "next/cache";
import { anonClient } from "./supabase/anon";
import { grupKata, kataPencarian, kolomCari, polaFrasa, type Cakupan } from "./cari";
import type { DevotionCard } from "./types";

const HALAMAN = 1000;
export const BATAS_HASIL = 1200;
const BATAS_BULAN = 1000;

type Hasil<T> = { data: T[] | null; error?: unknown };

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
};

export type HasilArsip = {
  devotions: DevotionCard[];
  longgar: boolean;
  galat: boolean;
};

async function kueri({ cari, cakupan, tahun, bulan, tema }: PermintaanArsip): Promise<HasilArsip> {
  const db = anonClient();
  const kolom = kolomCari(cakupan);
  const mode = cari ? "cari" : bulan ? "bulan" : tema ? "tema" : "pilih";
  if (mode === "pilih") return { devotions: [], longgar: false, galat: false };

  const dasar = () => {
    let q = db
      .from("devotions")
      .select("slug, devotion_date, title, summary, theme, hearts_count")
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

  if (mode === "cari" && pola.length > 0) {
    const flat = pola.flatMap((p) => kolom.map((c) => `${c}.ilike.*${p}*`)).join(",");
    const r = await ambilSemua<DevotionCard>(
      (dari, sampai) => dasar().or(flat).range(dari, sampai),
      BATAS_HASIL
    );
    if (r.error) galat = true;
    devotions = r.data;
  }

  if (mode === "cari" && devotions.length === 0 && kata.length > 1) {
    const bikinKata = (dari: number, sampai: number) => {
      let q2 = dasar();
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
      (dari, sampai) => dasar().range(dari, sampai),
      batas
    );
    if (r.error) galat = true;
    devotions = r.data;
    if (mode === "bulan") {
      devotions.sort(
        (a, b) => a.devotion_date.localeCompare(b.devotion_date) || a.slug.localeCompare(b.slug)
      );
    }
  }

  return { devotions, longgar, galat };
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
  if (!p.cari && !p.bulan && !p.tema) return { devotions: [], longgar: false, galat: false };
  return kueriCache(p);
}
