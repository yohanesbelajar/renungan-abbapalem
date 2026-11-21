import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AksiGrup from "@/components/komunitas/AksiGrup";

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
};

export default async function HalamanKomunitas() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-plum">Komunitas Saat Teduh</h1>
        <p className="mt-3 leading-relaxed text-tinta-2">
          Buat grup seperti grup WhatsApp: ajak teman sejawat, lalu lihat bersama
          siapa yang sudah menyelesaikan Saat Teduh hari ini. Progres hanya
          dibagikan di dalam grup yang Anda ikuti — halaman lain tetap privat.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/masuk?next=/komunitas" className="btn btn-utama">
            Masuk
          </Link>
          <Link href="/daftar" className="btn btn-sekunder">
            Daftar akun baru
          </Link>
        </div>
      </div>
    );
  }

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
      <h1 className="text-2xl font-bold text-plum">Komunitas Saat Teduh</h1>
      <p className="mt-2 text-sm text-tinta-2">
        Grup Anda untuk saling menguatkan — bukan berkompetisi.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat komunitas: {error.message}
        </p>
      )}

      <div className="mt-6 space-y-3">
        {Array.from(grup.entries()).map(([id, g]) => {
          const sudah = g.anggota.filter((a) => a.hari_ini).length;
          return (
            <Link
              key={id}
              href={`/komunitas/${id}`}
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
            Belum ada komunitas. Buat grup pertama Anda, atau masuk pakai kode
            undangan dari teman.
          </div>
        )}
      </div>

      <AksiGrup />
    </div>
  );
}
