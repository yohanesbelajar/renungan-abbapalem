import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { semuaRingkas } from "@/lib/publik";

export const revalidate = 1800;

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Halaman tahun dengan alamat bersih (/arsip/2025) — dipakai sitemap sebagai
// halaman indeks per tahun. Isi dan tautannya sama dengan /arsip?tahun=2025.
async function hitungTahun(tahun: string) {
  const baris = await semuaRingkas();
  const bulan = new Map<string, number>();
  const tema = new Map<string, Map<string, number>>();
  let total = 0;
  for (const b of baris) {
    if (!b.devotion_date.startsWith(tahun)) continue;
    const ym = b.devotion_date.slice(0, 7);
    total += 1;
    bulan.set(ym, (bulan.get(ym) ?? 0) + 1);
    if (b.theme) {
      const m = tema.get(ym) ?? new Map<string, number>();
      m.set(b.theme, (m.get(b.theme) ?? 0) + 1);
      tema.set(ym, m);
    }
  }
  const opsi = MONTHS.map((label, i) => {
    const ym = `${tahun}-${String(i + 1).padStart(2, "0")}`;
    const m = tema.get(ym);
    const utama = m ? [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null : null;
    return { ym, label, n: bulan.get(ym) ?? 0, tema: utama };
  });
  return { total, opsi };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tahun: string }>;
}): Promise<Metadata> {
  const { tahun } = await params;
  if (!/^\d{4}$/.test(tahun)) return {};
  const { total } = await hitungTahun(tahun);
  return {
    title: `Arsip Saat Teduh ${tahun}`,
    description: `${total} saat teduh Abbalove Palem sepanjang tahun ${tahun} — pilih bulan untuk membaca.`,
    alternates: { canonical: `/arsip/${tahun}` },
  };
}

export default async function TahunPage({
  params,
}: {
  params: Promise<{ tahun: string }>;
}) {
  const { tahun } = await params;
  if (!/^\d{4}$/.test(tahun)) notFound();
  const { total, opsi } = await hitungTahun(tahun);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link
        href="/arsip"
        className="inline-flex min-h-9 items-center text-[14px] font-medium text-tinta-2 transition hover:text-ungu"
      >
        ← Semua tahun
      </Link>
      <p className="label-kecil mt-4 text-ungu">Arsip</p>
      <h1 className="judul-rapat-sm mt-1 text-[32px] text-plum sm:text-[40px]">{tahun}</h1>
      <p className="mt-1 text-[15px] text-tinta-2">{total} saat teduh</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        {opsi.map((o) => (
          <Link
            key={o.ym}
            href={`/arsip?bulan=${o.ym}`}
            className={`kartu kartu-naik flex items-center justify-between gap-3 p-4 ${o.n === 0 ? "opacity-60" : ""}`}
          >
            <span>
              <span className="judul-rapat-sm block text-[18px] text-plum">{o.label}</span>
              <span className="mt-0.5 block text-[13px] text-tinta-3">{o.n} saat teduh</span>
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
    </div>
  );
}
