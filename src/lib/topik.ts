// Tema bulanan sebagai halaman tetap (/topik/<slug>) — jalur masuk dari mesin
// pencari. Slug dibuat dari nama tema; pencarian balik memakai slug yang sama,
// jadi tautan lama tetap sah walau huruf besar/kecil atau tanda baca berubah.

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://sate-alpalem.xyz";

export function slugTema(tema: string): string {
  return tema
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export type KelompokTema = {
  tema: string;
  slug: string;
  n: number;
  tahun: string[]; // tahun yang punya tema ini, terbaru dulu
  pertama: string; // tanggal paling awal
  terakhir: string; // tanggal paling akhir
};

/** Kelompokkan baris (tanggal + tema) menjadi daftar topik, terbanyak dulu. */
export function kelompokTema(
  baris: { devotion_date: string; theme: string | null }[]
): KelompokTema[] {
  const peta = new Map<string, KelompokTema>();
  for (const b of baris) {
    if (!b.theme) continue;
    const slug = slugTema(b.theme);
    if (!slug) continue;
    let k = peta.get(slug);
    if (!k) {
      k = { tema: b.theme, slug, n: 0, tahun: [], pertama: b.devotion_date, terakhir: b.devotion_date };
      peta.set(slug, k);
    }
    k.n += 1;
    const y = b.devotion_date.slice(0, 4);
    if (!k.tahun.includes(y)) k.tahun.push(y);
    if (b.devotion_date < k.pertama) k.pertama = b.devotion_date;
    if (b.devotion_date > k.terakhir) k.terakhir = b.devotion_date;
  }
  const daftar = [...peta.values()];
  for (const k of daftar) k.tahun.sort().reverse();
  return daftar.sort((a, b) => b.n - a.n || a.tema.localeCompare(b.tema, "id"));
}
