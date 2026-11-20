// Penghitung pengunjung — disimpan sebagai objek kecil di Supabase Storage,
// BUKAN tabel baru: satu berkas per pengunjung per hari
// (`kunjungan/<tanggal>__<id>.json`), jadi dedup terjadi dengan sendirinya.
// Tidak ada data pribadi (tanpa IP, tanpa user agent, tanpa halaman).
//
// Berkasnya DATAR (satu tingkat) supaya seluruh angka bisa diambil lewat SATU
// permintaan daftar — daftar per hari butuh 30+ permintaan dan membuat halaman
// admin butuh ±9 detik (sudah diukur, tidak bisa diterima).
//
// Semua fungsi di sini hanya boleh dipanggil dari server (kunci layanan).

import { createServiceClient } from "@/lib/supabase/service";

export const BUCKET_PENGUNJUNG = "pengunjung";
const PREFIX = "kunjungan";
const PREFIX_LAMA = "harian"; // struktur lama (tes awal) — ikut dihitung supaya tidak dobel
const BATAS_HALAMAN = 1000;
const BATAS_HARI_TOTAL = 400;
const CACHE_MS = 60_000;

/** Tanggal "hari ini" (YYYY-MM-DD) menurut zona Asia/Jakarta. */
export function hariJakarta(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function geserHari(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00+07:00`);
  d.setUTCDate(d.getUTCDate() + delta);
  return hariJakarta(d);
}

function sah(id: string): boolean {
  return /^[A-Za-z0-9-]{8,64}$/.test(id);
}

/** Catat satu kunjungan. Aman dipanggil berulang: id sama pada hari sama = satu berkas. */
export async function catatKunjungan(id: string): Promise<void> {
  if (!sah(id)) throw new Error("id tidak sah");
  const supabase = createServiceClient();
  const hari = hariJakarta();
  const { error } = await supabase.storage
    .from(BUCKET_PENGUNJUNG)
    .upload(`${PREFIX}/${hari}__${id}.json`, new Blob([JSON.stringify({ hari })], { type: "application/json" }), {
      upsert: true,
      contentType: "application/json",
      cacheControl: "60",
    });
  if (error) throw new Error(error.message);
}

type Baris = { nama: string };

async function daftarDatar(prefix: string, offset = 0): Promise<Baris[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET_PENGUNJUNG)
    .list(prefix, {
      limit: BATAS_HALAMAN,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((o) => o.name && o.name.endsWith(".json"))
    .map((o) => ({ nama: o.name }));
}

/** Seluruh isi bucket sebagai penghitung per hari — satu kali jalan, hasil disimpan sebentar. */
async function hitungSemua(): Promise<Map<string, number>> {
  const peta = new Map<string, number>();
  const tambah = (hari: string) => peta.set(hari, (peta.get(hari) ?? 0) + 1);

  // Struktur datar baru: kunjungan/<tanggal>__<id>.json
  let offset = 0;
  for (;;) {
    const baris = await daftarDatar(PREFIX, offset);
    for (const b of baris) {
      const m = /^(\d{4}-\d{2}-\d{2})__/.exec(b.nama);
      if (m) tambah(m[1]);
    }
    if (baris.length < BATAS_HALAMAN) break;
    offset += BATAS_HALAMAN;
  }

  // Struktur lama: harian/<tanggal>/<id>.json (hanya data tes awal, ikut dihitung)
  const supabase = createServiceClient();
  const { data: folder, error } = await supabase.storage
    .from(BUCKET_PENGUNJUNG)
    .list(PREFIX_LAMA, { limit: BATAS_HALAMAN, sortBy: { column: "name", order: "desc" } });
  if (error) throw new Error(error.message);
  for (const f of folder ?? []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f.name)) continue;
    const baris = await daftarDatar(`${PREFIX_LAMA}/${f.name}`);
    for (const b of baris) tambah(f.name);
  }

  return peta;
}

let cache: { waktu: number; peta: Map<string, number> } | null = null;

async function petaSegar(): Promise<Map<string, number>> {
  if (cache && Date.now() - cache.waktu < CACHE_MS) return cache.peta;
  const peta = await hitungSemua();
  cache = { waktu: Date.now(), peta };
  return peta;
}

export type RingkasanPengunjung = {
  hariIni: number;
  kemarin: number;
  tujuhHari: number;
  tigaPuluhHari: number;
  total: number;
  hariTercatat: number;
  harian: { hari: string; jumlah: number }[];
  galat: boolean;
};

/**
 * Ringkasan angka pengunjung. Hari tanpa catatan = 0 (bukan galat).
 * `galat` hanya true kalau pembacaan Storage benar-benar gagal.
 */
export async function ringkasanPengunjung(hariTampil = 14): Promise<RingkasanPengunjung> {
  const hariIni = hariJakarta();
  const hari = Array.from({ length: 30 }, (_, i) => geserHari(hariIni, -i));

  let peta: Map<string, number> | null = null;
  let galat = false;
  try {
    peta = await petaSegar();
  } catch {
    galat = true;
    peta = new Map();
  }
  const n = (h: string) => peta?.get(h) ?? 0;

  const tujuhHari = hari.slice(0, 7).reduce((a, h) => a + n(h), 0);
  const tigaPuluhHari = hari.reduce((a, h) => a + n(h), 0);
  const semuaHari = [...peta.keys()].sort().reverse().slice(0, BATAS_HARI_TOTAL);
  const total = semuaHari.reduce((a, h) => a + n(h), 0);

  return {
    hariIni: n(hariIni),
    kemarin: n(geserHari(hariIni, -1)),
    tujuhHari,
    tigaPuluhHari,
    total,
    hariTercatat: semuaHari.length,
    harian: hari.slice(0, hariTampil).map((h) => ({ hari: h, jumlah: n(h) })),
    galat,
  };
}
