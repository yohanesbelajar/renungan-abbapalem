import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TautanUndang from "@/components/grup/TautanUndang";
import UbahPeran from "@/components/grup/UbahPeran";
import TinggalkanGrup from "@/components/grup/TinggalkanGrup";
import type { BarisKomunitas } from "../page";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

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
          <span>Bintang minggu · streak</span>
        </div>
        <ul className="divide-y divide-garis-tipis">
          {anggota.map((a) => {
            const bintang = a.minggu ?? Array<boolean>(7).fill(false);
            // Peran dibedakan lewat ketebalan huruf + titik warna — tanpa label tulisan.
            const tebal =
              a.peran === "owner"
                ? "font-bold"
                : a.peran === "admin"
                  ? "font-semibold"
                  : "font-medium";
            const peranJudul =
              a.peran === "owner"
                ? "Pemilik grup"
                : a.peran === "admin"
                  ? "Admin grup"
                  : undefined;
            return (
              <li
                key={a.user_id}
                data-user={a.user_id}
                data-peran={a.peran}
                data-status={a.hari_ini ? "sudah" : "belum"}
                data-streak={a.streak}
                data-bintang={bintang.map((b) => (b ? "1" : "0")).join("")}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <span
                    title={peranJudul}
                    className={`inline-block max-w-full truncate rounded-md px-2 py-0.5 ${tebal} ${
                      a.hari_ini ? "bg-baca-ya" : "bg-baca-tidak"
                    }`}
                  >
                    {a.nama}
                    {a.peran !== "member" && (
                      <span
                        aria-hidden
                        className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                          a.peran === "owner" ? "bg-plum" : "bg-ungu"
                        }`}
                      />
                    )}
                  </span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <span
                    title="Bintang minggu ini (Minggu–Sabtu)"
                    className="flex items-center gap-[2px] text-[15px] leading-none"
                  >
                    {bintang.map((b, i) => (
                      <span
                        key={i}
                        data-bintang-hari={i}
                        title={`${HARI[i]}: ${b ? "sudah dibaca" : "belum"}`}
                        className={b ? "text-bintang-nyala" : "text-bintang-padam"}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                  <span
                    data-streak-angka
                    title="Baca beruntun sampai hari ini"
                    aria-label={`Baca beruntun ${a.streak} hari`}
                    className="min-w-6 text-right text-sm font-semibold text-senja"
                  >
                    {a.streak}
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
            );
          })}
        </ul>
      </div>

      <p className="mt-3 text-xs text-tinta-3">
        Nama berlatar hijau = sudah baca hari ini, abu = belum. Bintang = hari
        yang dibaca minggu ini (Minggu–Sabtu), angka di sebelahnya = baca
        beruntun. Yang tampil di sini hanya catatan bacaan, bukan isi renungan
        atau doa pribadi Anda.
      </p>

      <div className="mt-6">
        <TinggalkanGrup grupId={id} namaGrup={grupNama} />
      </div>
    </div>
  );
}
