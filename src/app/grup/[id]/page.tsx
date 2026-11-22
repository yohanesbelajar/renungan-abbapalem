import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TautanUndang from "@/components/grup/TautanUndang";
import UbahPeran from "@/components/grup/UbahPeran";
import TinggalkanGrup from "@/components/grup/TinggalkanGrup";
import { HARI_SINGKAT, inisial } from "@/lib/grup-tampilan";
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
  const jumlah = anggota.length;
  const sudah = anggota.filter((a) => a.hari_ini).length;
  const persen = jumlah > 0 ? Math.round((sudah / jumlah) * 100) : 0;
  const lengkap = sudah === jumlah && jumlah > 0;
  const streakTerbaik = Math.max(...anggota.map((a) => a.streak ?? 0));

  const peranSaya =
    anggota.find((a) => a.user_id === user.id)?.peran ?? "member";
  const bolehUndang = peranSaya === "owner" || peranSaya === "admin";
  const sayaPemilik = peranSaya === "owner";

  // Pemilik dulu, lalu streak terbesar — supaya yang konsisten mudah terlihat.
  const urut = [...anggota].sort((a, b) => {
    const bobot = (p: string) => (p === "owner" ? 0 : p === "admin" ? 1 : 2);
    return bobot(a.peran) - bobot(b.peran) || (b.streak ?? 0) - (a.streak ?? 0);
  });

  const hariIni = new Date().getDay(); // 0 = Minggu

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-6">
      <Link
        href="/grup"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-tinta-2 transition hover:text-plum"
      >
        <span aria-hidden>←</span> Semua grup
      </Link>

      {/* ===== Kepala grup: identitas + ringkasan hari ini ===== */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
        <div className="relative px-5 pb-5 pt-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(120%_100%_at_15%_-30%,#f3ecf8_0%,rgba(255,255,255,0)_70%),radial-gradient(90%_90%_at_95%_-40%,#fbe4c4_0%,rgba(255,255,255,0)_65%)]"
          />
          <div className="relative flex items-start gap-4">
            <span
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(160deg,#963296,#6b2a55)] text-[19px] font-bold text-white shadow-[0_6px_18px_-8px_rgba(74,35,82,0.8)]"
            >
              {inisial(grupNama)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="label-kecil text-ungu">Grup</p>
              <h1 className="judul-rapat-sm mt-1 text-[24px] text-plum sm:text-[28px]">
                {grupNama}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-tinta-3">
                <span>{jumlah} anggota</span>
                <span aria-hidden>·</span>
                <span>
                  <strong className="font-semibold text-tinta-2">{sudah}</strong>{" "}
                  sudah baca hari ini
                </span>
              </p>
            </div>
          </div>

          {/* Kemajuan hari ini */}
          <div className="relative mt-5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-krem-3">
              <div
                className={`h-full rounded-full ${
                  lengkap
                    ? "bg-[linear-gradient(90deg,#2f9e6a,#48c78e)]"
                    : "bg-[linear-gradient(90deg,#963296,#c07ad0)]"
                }`}
                style={{ width: `${persen}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-krem-2 px-2 py-2">
                <p className="text-[17px] font-bold leading-tight text-plum">
                  {persen}%
                </p>
                <p className="text-[11px] leading-tight text-tinta-3">
                  baca hari ini
                </p>
              </div>
              <div className="rounded-xl bg-krem-2 px-2 py-2">
                <p className="text-[17px] font-bold leading-tight text-senja">
                  {streakTerbaik}
                </p>
                <p className="text-[11px] leading-tight text-tinta-3">
                  beruntun terpanjang
                </p>
              </div>
              <div className="rounded-xl bg-krem-2 px-2 py-2">
                <p className="text-[17px] font-bold leading-tight text-ungu">
                  {anggota.filter((a) => a.hari_ini).length}
                  <span className="text-[12px] font-semibold text-tinta-3">
                    /{jumlah}
                  </span>
                </p>
                <p className="text-[11px] leading-tight text-tinta-3">
                  sudah hari ini
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tautan undangan hanya untuk pemilik/admin grup */}
      {bolehUndang && (
        <div className="mt-4">
          <TautanUndang kode={kode} />
        </div>
      )}

      {/* ===== Papan anggota ===== */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-garis-tipis bg-kertas">
        <div className="flex items-center justify-between gap-3 border-b border-garis-tipis bg-krem-2 px-4 py-2.5">
          <span className="label-kecil text-tinta-3">Anggota</span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">
            Minggu ini
          </span>
        </div>

        <ul className="divide-y divide-garis-tipis">
          {urut.map((a) => {
            const bintang = a.minggu ?? Array<boolean>(7).fill(false);
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
                  : "Anggota";
            const sayaSendiri = a.user_id === user.id;
            return (
              <li
                key={a.user_id}
                data-user={a.user_id}
                data-peran={a.peran}
                data-status={a.hari_ini ? "sudah" : "belum"}
                data-streak={a.streak}
                data-bintang={bintang.map((b) => (b ? "1" : "0")).join("")}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <div
                  aria-hidden
                  className={`row-start-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                    a.hari_ini
                      ? "bg-baca-ya text-[#1f6b48]"
                      : "bg-baca-tidak text-tinta-3"
                  }`}
                >
                  {inisial(a.nama)}
                </div>

                <div className="row-start-1 min-w-0">
                  <span
                    title={peranJudul}
                    className={`flex max-w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-[15px] ${tebal} ${
                      a.hari_ini ? "bg-baca-ya text-tinta" : "bg-baca-tidak text-tinta-2"
                    }`}
                  >
                    <span className="truncate">{a.nama}</span>
                    {sayaSendiri && (
                      <span className="shrink-0 rounded-full bg-kertas/80 px-1.5 py-px text-[10.5px] font-semibold text-ungu">
                        Anda
                      </span>
                    )}
                    {a.peran !== "member" && (
                      <span
                        aria-hidden
                        title={peranJudul}
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          a.peran === "owner" ? "bg-plum" : "bg-ungu"
                        }`}
                      />
                    )}
                  </span>
                  <p className="mt-0.5 truncate pl-2 text-[11.5px] text-tinta-2">
                    {a.hari_ini ? "Sudah baca" : "Belum baca"} · {peranJudul}
                  </p>
                </div>

                <div className="col-span-2 row-start-2 flex shrink-0 items-center justify-end gap-2 sm:col-span-1 sm:row-start-1 sm:justify-self-auto">
                  <span className="grid grid-cols-7 gap-x-[1px]">
                    {HARI_SINGKAT.map((h, i) => (
                      <span
                        key={`h${i}`}
                        aria-hidden
                        className={`w-[14px] text-center text-[8.5px] font-bold uppercase leading-none ${
                          i === hariIni ? "text-ungu" : "text-tinta-3"
                        }`}
                      >
                        {h}
                      </span>
                    ))}
                    {bintang.map((b, i) => (
                      <span
                        key={`b${i}`}
                        data-bintang-hari={i}
                        title={`${HARI[i]}: ${b ? "sudah dibaca" : "belum"}`}
                        className={`w-[14px] text-center text-[14px] leading-[1.35] ${
                          b ? "text-bintang-nyala" : "text-bintang-padam"
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </span>
                  <span
                    data-streak-angka
                    title="Baca beruntun sampai hari ini"
                    aria-label={`Baca beruntun ${a.streak} hari`}
                    className="inline-flex min-w-[44px] items-center justify-center gap-1 rounded-full bg-senja/15 px-2 py-1 text-[12.5px] font-bold text-jingga"
                  >
                    <span aria-hidden className="text-[10px]">🔥</span>
                    {a.streak}
                  </span>
                </div>

                {sayaPemilik && a.user_id !== user.id && (
                  <div className="col-span-2 row-start-3 justify-self-end sm:col-span-2 sm:col-start-2 sm:row-start-2">
                    <UbahPeran
                      grupId={id}
                      userId={a.user_id}
                      peranSekarang={a.peran}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-tinta-3">
        Latar hijau = sudah baca hari ini. Tujuh bintang = hari yang dibaca
        minggu ini (Minggu–Sabtu), angka di sebelahnya = baca beruntun. Yang
        tampil hanya catatan bacaan, bukan isi renungan atau doa pribadi Anda.
      </p>

      <div className="mt-8 border-t border-garis-tipis pt-5">
        <TinggalkanGrup grupId={id} namaGrup={grupNama} />
      </div>
    </div>
  );
}
