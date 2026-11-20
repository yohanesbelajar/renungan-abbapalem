// Penyegar cache publik. Dipanggil setelah admin menyimpan edisi dan setelah
// cron menerbitkan edisi terjadwal, supaya sitemap/halaman topik/arsip tidak
// menunggu masa revalidate. Tanpa kunci rahasia: hanya menyegarkan cache,
// tidak mengubah data — tapi tetap dibatasi agar tidak bisa dibanjiri.
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let jendela = 0;
let jumlah = 0;

export async function POST(request: Request) {
  // Penerbitan otomatis membawa kunci cron; admin yang login cukup sesi.
  const cron = request.headers.get("authorization");
  const kunciSah = !!process.env.CRON_SECRET && cron === `Bearer ${process.env.CRON_SECRET}`;

  if (!kunciSah) {
    const sekarang = Math.floor(Date.now() / 60000);
    if (sekarang !== jendela) {
      jendela = sekarang;
      jumlah = 0;
    }
    jumlah += 1;
    if (jumlah > 60) return NextResponse.json({ ok: false }, { status: 429 });
  }

  revalidateTag("devotions", "max");
  return NextResponse.json({ ok: true });
}
