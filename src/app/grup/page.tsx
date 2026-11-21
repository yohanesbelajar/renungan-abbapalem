import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AksiGrup from "@/components/grup/AksiGrup";

export const dynamic = "force-dynamic";

export type BarisKomunitas = {
  grup_id: string;
  grup_nama: string;
  kode_undang: string;
  user_id: string;
  nama: string;
  peran: string;
  bergabung: string;
  hari_ini: boolean;
  total_selesai: number;
  streak: number;
  /** 7 boolean Minggu..Sabtu minggu berjalan — true bila hari itu dibaca. */
  minggu: boolean[];
};

export default async function HalamanKomunitas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belum login / belum punya akun → langsung ke halaman masuk
  // (di halaman itu ada tautan "Daftar" untuk akun baru).
  if (!user) redirect("/masuk?next=/grup");

  const { data, error } = await supabase.rpc("komunitas_progres");
  const baris = ((data ?? []) as BarisKomunitas[]).filter((b) => b.grup_id);

  const grup = new Map<
    string,
    { nama: string; kode: string; anggota: BarisKomunitas[] }
  >();
  for (const b of baris) {
    const g =
      grup.get(b.grup_id) ?? { nama: b.grup_nama, kode: b.kode_undang, anggota: [] };
    g.anggota.push(b);
    grup.set(b.grup_id, g);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-plum">Grup Saat Teduh</h1>
      <p className="mt-2 text-sm text-tinta-2">
        Grup Anda untuk saling menguatkan — bukan berkompetisi.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat grup: {error.message}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {Array.from(grup.entries()).map(([id, g]) => {
          const sudah = g.anggota.filter((a) => a.hari_ini).length;
          return (
            <Link
              key={id}
              href={`/grup/${id}`}
              className="block rounded-2xl border border-garis-tipis bg-kertas p-4 transition hover:border-ungu/40 hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-plum">{g.nama}</h2>
                <span className="shrink-0 text-xs text-tinta-3">
                  {g.anggota.length} anggota
                </span>
              </div>
              <p className="mt-1 text-sm text-tinta-2">
                {sudah} dari {g.anggota.length} sudah baca hari ini
              </p>
            </Link>
          );
        })}

        {grup.size === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-garis p-6 text-center text-sm text-tinta-2">
            Belum ada grup. Buat grup pertama Anda, atau masuk pakai kode
            undangan dari teman.
          </div>
        )}
      </div>

      <AksiGrup />
    </div>
  );
}
