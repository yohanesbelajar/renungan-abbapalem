// Penerima tembakan pencatat kunjungan. Sengaja TIDAK memakai sesi pengguna:
// pengunjung anonim pun dihitung. Yang disimpan hanya "ada satu pengunjung
// dengan id ini pada tanggal ini" — tanpa IP, tanpa user agent, tanpa halaman.
import { NextResponse } from "next/server";
import { catatKunjungan } from "@/lib/pengunjung";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Pembatas kasar: satu proses boleh melayani paling banyak 120 tembakan/menit.
// Bukan pengaman data (Storage sudah dedup), hanya penjaga agar tidak dibanjiri.
let jendela = 0;
let jumlah = 0;
function terlaluRamai(): boolean {
  const sekarang = Math.floor(Date.now() / 60000);
  if (sekarang !== jendela) {
    jendela = sekarang;
    jumlah = 0;
  }
  jumlah += 1;
  return jumlah > 120;
}

export async function POST(request: Request) {
  let id = "";
  try {
    const isi = (await request.json()) as { id?: unknown };
    id = typeof isi.id === "string" ? isi.id : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (terlaluRamai()) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  try {
    await catatKunjungan(id);
    return NextResponse.json({ ok: true });
  } catch {
    // Kegagalan pencatatan tidak boleh terlihat sebagai galat situs.
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
