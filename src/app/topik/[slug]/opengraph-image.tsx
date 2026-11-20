import { kartuTopik } from "@/lib/og";
import { semuaTerbit } from "@/lib/publik";
import { kelompokTema } from "@/lib/topik";
import { formatTanggalID } from "@/lib/dates";

export const alt = "Topik saat teduh Abbalove Palem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 1800;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = kelompokTema(await semuaTerbit()).find((x) => x.slug === slug);

  return kartuTopik({
    tema: t?.tema ?? "Saat Teduh",
    jumlah: t?.n ?? 0,
    rentang: t
      ? `${formatTanggalID(t.pertama)} — ${formatTanggalID(t.terakhir)}`
      : "sate-alpalem.xyz",
  });
}
