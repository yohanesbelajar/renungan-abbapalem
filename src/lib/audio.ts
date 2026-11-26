// Daftar audio renungan yang tersedia.
//
// Audio dibuat di luar situs (scripts/audio) untuk 7 hari terakhir dan ditaruh
// sebagai MP3 di Supabase Storage. manifest.json adalah satu-satunya sumber
// kebenaran: kalau slug tidak ada di sana, edisi itu memang belum punya audio.
//
// Dibaca di server supaya tombol pemutar langsung ada di HTML pertama (tanpa
// kedip), dengan cache 10 menit agar tidak memanggil Storage tiap permintaan.

export type EntriAudio = {
  berkas: string;
  durasi: number;
  judul: string;
  tanggal: string;
};

export type ManifestAudio = Record<string, EntriAudio>;

const BUCKET = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/audio-renungan`;

const UMUR_CACHE_MS = 10 * 60 * 1000;
let cache: { isi: ManifestAudio; waktu: number } | null = null;

export async function manifestAudio(): Promise<ManifestAudio> {
  if (cache && Date.now() - cache.waktu < UMUR_CACHE_MS) return cache.isi;
  try {
    const res = await fetch(`${BUCKET}/manifest.json`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return cache?.isi ?? {};
    const isi = (await res.json()) as ManifestAudio;
    cache = { isi, waktu: Date.now() };
    return isi;
  } catch {
    // Storage tidak terjangkau: pakai cache lama bila ada, jangan gagal render.
    return cache?.isi ?? {};
  }
}

export async function audioUntuk(slug: string): Promise<EntriAudio | null> {
  const semua = await manifestAudio();
  return semua[slug] ?? null;
}

export function urlAudio(berkas: string): string {
  return `${BUCKET}/${berkas}`;
}
