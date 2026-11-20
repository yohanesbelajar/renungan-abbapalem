import type { MetadataRoute } from "next";
import { semuaTerbit } from "@/lib/publik";
import { kelompokTema, SITE_URL } from "@/lib/topik";

// Sitemap dibangun dari DB (bukan daftar tangan): 1.000+ edisi + halaman topik
// + halaman tahun. Di-cache bersama data publik, disegarkan oleh /api/segar.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const terbit = await semuaTerbit();
  const topik = kelompokTema(terbit);

  const tetap: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/arsip`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/topik`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/tentang`, changeFrequency: "monthly", priority: 0.4 },
  ];

  // Halaman tahun (sama dengan /arsip?tahun=YYYY, tapi URL-nya bersih).
  const tahun = [...new Set(terbit.map((d) => d.devotion_date.slice(0, 4)))].sort().reverse();
  const halamanTahun: MetadataRoute.Sitemap = tahun.map((y) => ({
    url: `${SITE_URL}/arsip/${y}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const halamanTopik: MetadataRoute.Sitemap = topik.map((t) => ({
    url: `${SITE_URL}/topik/${t.slug}`,
    lastModified: t.terakhir,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const edisi: MetadataRoute.Sitemap = terbit.map((d) => ({
    url: `${SITE_URL}/saat-teduh/${d.slug}`,
    lastModified: `${d.devotion_date}T00:05:00+07:00`,
    changeFrequency: "yearly",
    priority: 0.5,
  }));

  return [...tetap, ...halamanTahun, ...halamanTopik, ...edisi];
}
