import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AksiGrup from "@/components/grup/AksiGrup";
import { inisial } from "@/lib/grup-tampilan";

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
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <p className="label-kecil text-ungu">Bersama-sama</p>
      <h1 className="judul-rapat-sm mt-2 text-[28px] text-plum sm:text-[34px]">
        Grup saat teduh
      </h1>
      <p className="mt-2 max-w-md text-[15px] leading-relaxed text-tinta-2">
        Saling menguatkan dalam bacaan harian — bukan berkompetisi.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat grup: {error.message}
        </p>
      )}

      <div className="mt-7 space-y-3">
        {Array.from(grup.entries()).map(([id, g]) => {
          const sudah = g.anggota.filter((a) => a.hari_ini).length;
          const jumlah = g.anggota.length;
          const persen = jumlah > 0 ? Math.round((sudah / jumlah) * 100) : 0;
          const lengkap = jumlah > 0 && sudah === jumlah;
          const teratas = [...g.anggota].sort((a, b) => b.streak - a.streak)[0];

          return (
            <Link
              key={id}
              href={`/grup/${id}`}
              data-kartu-grup={id}
              className="kartu-naik block overflow-hidden rounded-2xl border border-garis-tipis bg-kertas"
            >
              <div className="flex items-start gap-3.5 px-4 pb-3.5 pt-4">
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lavender text-[15px] font-bold text-ungu-2"
                >
                  {inisial(g.nama)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="judul-rapat-sm min-w-0 truncate text-[17px] text-plum">
                      {g.nama}
                    </h2>
                    <span
                      aria-hidden
                      className="mt-0.5 shrink-0 text-tinta-3 transition group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </div>

                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-3">
                    <span>
                      <strong className="font-semibold text-tinta-2">
                        {sudah} dari {jumlah}
                      </strong>{" "}
                      sudah baca hari ini
                    </span>
                    {teratas && teratas.streak > 0 && (
                      <span className="whitespace-nowrap">
                        <span aria-hidden className="text-tinta-3/60">
                          ·{" "}
                        </span>
                        beruntun terpanjang{" "}
                        <strong className="font-semibold text-jingga">
                          {teratas.streak} hari
                        </strong>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Bilah kemajuan hari ini: hijau penuh bila semua sudah membaca */}
              <div className="px-4 pb-4">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-krem-3">
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      lengkap
                        ? "bg-[linear-gradient(90deg,#2f9e6a,#48c78e)]"
                        : "bg-[linear-gradient(90deg,#963296,#c07ad0)]"
                    }`}
                    style={{ width: `${persen}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11.5px] text-tinta-3">
                  <span>
                    {lengkap ? "Semua anggota sudah membaca hari ini" : `${persen}% hari ini`}
                  </span>
                  <span>{jumlah} anggota</span>
                </div>
              </div>
            </Link>
          );
        })}

        {grup.size === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-garis bg-kertas/50 px-6 py-10 text-center">
            <p className="text-[15px] font-semibold text-plum">Belum ada grup</p>
            <p className="mx-auto mt-1 max-w-xs text-[13.5px] leading-relaxed text-tinta-2">
              Buat grup pertama Anda, atau masuk pakai kode undangan dari teman.
            </p>
          </div>
        )}
      </div>

      <AksiGrup />
    </div>
  );
}
