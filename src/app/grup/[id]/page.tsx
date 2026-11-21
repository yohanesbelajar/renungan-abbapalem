import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TautanUndang from "@/components/grup/TautanUndang";
import UbahPeran from "@/components/grup/UbahPeran";
import TinggalkanGrup from "@/components/grup/TinggalkanGrup";
import type { BarisKomunitas } from "../page";

export const dynamic = "force-dynamic";

export default async function HalamanGrup({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/masuk?next=/grup/${id}`);

  const { data, error } = await supabase.rpc("komunitas_progres");
  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat grup: {error.message}
        </p>
        <Link href="/grup" className="btn btn-sekunder mt-4">
          Kembali ke grup
        </Link>
      </div>
    );
  }

  const anggota = ((data ?? []) as BarisKomunitas[]).filter(
    (b) => b.grup_id === id
  );
  // Bukan anggota (atau grup tidak ada) → jangan bocorkan apa pun.
  if (anggota.length === 0) notFound();

  const grupNama = anggota[0].grup_nama;
  const kode = anggota[0].kode_undang;
  const sudah = anggota.filter((a) => a.hari_ini).length;

  const peranSaya =
    anggota.find((a) => a.user_id === user.id)?.peran ?? "member";
  const bolehUndang = peranSaya === "owner" || peranSaya === "admin";
  const sayaPemilik = peranSaya === "owner";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/grup"
        className="text-sm text-tinta-2 hover:text-plum"
      >
        ← Semua grup
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-plum">{grupNama}</h1>
          <p className="mt-1 text-sm text-tinta-2">
            {anggota.length} anggota · {sudah} sudah baca hari ini
          </p>
        </div>
      </div>

      {/* Tautan undangan hanya untuk pemilik/admin grup */}
      {bolehUndang && (
        <div className="mt-4">
          <TautanUndang kode={kode} />
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-garis-tipis bg-kertas">
        <div className="flex items-center justify-between border-b border-garis-tipis bg-krem-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-tinta-3">
          <span>Anggota</span>
          <span>Hari ini · streak</span>
        </div>
        <ul className="divide-y divide-garis-tipis">
          {anggota.map((a) => (
            <li
              key={a.user_id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-tinta">
                  {a.nama}
                  {a.peran === "owner" && (
                    <span className="ml-2 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-plum">
                      Pemilik
                    </span>
                  )}
                  {a.peran === "admin" && (
                    <span className="ml-2 rounded-full bg-lavender px-2 py-0.5 text-[11px] font-medium text-plum">
                      Admin
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  title="Baca beruntun sampai hari ini"
                  className="font-semibold text-[#c77700]"
                >
                  ✳ {a.streak}
                </span>
                <span
                  className={
                    a.hari_ini
                      ? "rounded-full bg-[#e7f6ec] px-3 py-1 text-xs font-semibold text-[#1e7a44]"
                      : "rounded-full bg-krem-3 px-3 py-1 text-xs text-tinta-3"
                  }
                >
                  {a.hari_ini ? "✓ Sudah baca" : "Belum"}
                </span>
                {sayaPemilik && a.user_id !== user.id && (
                  <UbahPeran
                    grupId={id}
                    userId={a.user_id}
                    peranSekarang={a.peran}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-xs text-tinta-3">
        Yang tampil di halaman ini hanya catatan bacaan (sudah/belum), bukan
        isi renungan atau doa pribadi Anda.
      </p>

      <div className="mt-6">
        <TinggalkanGrup grupId={id} namaGrup={grupNama} />
      </div>
    </div>
  );
}
