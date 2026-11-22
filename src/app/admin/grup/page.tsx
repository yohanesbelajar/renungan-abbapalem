import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BarisKomunitas } from "@/app/grup/page";
import Kepala, { KotakAngka } from "@/components/admin/Kepala";
import { IkonGrup, IkonOrang, IkonCentang } from "@/components/admin/IkonAdmin";
import { inisial } from "@/lib/grup-tampilan";

export const dynamic = "force-dynamic";

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type BarisAktivitas = {
  id: string;
  terjadi_at: string;
  jenis: string;
  user_id: string | null;
  grup_id: string | null;
  keterangan: string | null;
};

/** Waktu WIB: "22 Nov, 14:05". */
function jam(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function kalimat(a: BarisAktivitas, nama: string, grup: string): string {
  switch (a.jenis) {
    case "daftar":
      return `${a.keterangan ?? "akun baru"} mendaftar`;
    case "buat_grup":
      return `${nama} membuat grup “${grup}”`;
    case "gabung_grup":
      return a.keterangan === "menjadi pemilik"
        ? `${nama} menjadi pemilik “${grup}”`
        : `${nama} bergabung ke “${grup}”`;
    case "keluar_grup":
      return `${nama} keluar dari “${grup}”`;
    case "tendang_anggota":
      return `${nama} mengeluarkan seorang anggota dari “${grup}”`;
    case "ubah_nama":
      return `${nama} mengganti nama → ${a.keterangan ?? "-"}`;
    case "baca":
      return `${nama} membaca “${a.keterangan ?? "saat teduh"}”`;
    default:
      return a.jenis;
  }
}

const WARNA_JENIS: Record<string, string> = {
  daftar: "bg-lavender text-ungu",
  buat_grup: "bg-baca-ya text-[#1f6b48]",
  gabung_grup: "bg-baca-ya text-[#1f6b48]",
  keluar_grup: "bg-krem-3 text-tinta-2",
  tendang_anggota: "bg-merah/10 text-merah",
  baca: "bg-senja/15 text-jingga",
  ubah_nama: "bg-krem-2 text-tinta-2",
};

const TITIK_JENIS: Record<string, string> = {
  daftar: "bg-ungu",
  buat_grup: "bg-[#2f9e6a]",
  gabung_grup: "bg-[#2f9e6a]",
  keluar_grup: "bg-tinta-3",
  tendang_anggota: "bg-merah",
  baca: "bg-senja",
  ubah_nama: "bg-ungu",
};

export default async function HalamanPantauGrup() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk?next=/admin/grup");

  // Kunci di belakang layar: hanya akun superadmin (Jo). Bukan pengawas →
  // 404 dan tidak ada satu pun data yang diambil atau dirender.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "superadmin") notFound();

  const { data, error } = await supabase.rpc("pengawas_progres");
  const baris = ((data ?? []) as BarisKomunitas[]).filter((b) => b.grup_id);

  const { data: aktRows } = await supabase
    .from("aktivitas")
    .select("id, terjadi_at, jenis, user_id, grup_id, keterangan")
    .order("terjadi_at", { ascending: false })
    .limit(50);
  const aktivitas = (aktRows ?? []) as BarisAktivitas[];

  const grup = new Map<string, { nama: string; anggota: BarisKomunitas[] }>();
  const namaUser = new Map<string, string>();
  for (const b of baris) {
    const g = grup.get(b.grup_id) ?? { nama: b.grup_nama, anggota: [] };
    g.anggota.push(b);
    grup.set(b.grup_id, g);
    namaUser.set(b.user_id, b.nama);
  }
  const namaGrup = (id: string | null) =>
    id ? (grup.get(id)?.nama ?? "(grup terhapus)") : "(grup)";

  const totalAnggota = baris.length;
  const sudahBaca = baris.filter((b) => b.hari_ini).length;
  const persenSemua = totalAnggota ? Math.round((sudahBaca / totalAnggota) * 100) : 0;

  const daftarGrup = [...grup.entries()].sort((a, b) => b[1].anggota.length - a[1].anggota.length);

  return (
    <div className="space-y-5">
      <Kepala
        label="Pengawasan"
        judul="Grup"
        keterangan="Seluruh grup di situs — tanpa perlu menjadi anggotanya. Halaman ini hanya untuk melihat; tidak ada tombol ubah atau hapus."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KotakAngka label="Grup" nilai={grup.size} Ikon={IkonGrup} nada="ungu" />
        <KotakAngka label="Keanggotaan" nilai={totalAnggota} Ikon={IkonOrang} nada="netral" />
        <KotakAngka label="Baca hari ini" nilai={sudahBaca} Ikon={IkonCentang} nada="hijau" />
        <KotakAngka label="Partisipasi" nilai={persenSemua} satuan="%" nada="senja" />
      </div>

      {error && (
        <p className="rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat data: {error.message}
        </p>
      )}

      {/* ===== Daftar grup ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        {daftarGrup.map(([id, g]) => {
          const sudah = g.anggota.filter((a) => a.hari_ini).length;
          const jumlah = g.anggota.length;
          const persen = jumlah ? Math.round((sudah / jumlah) * 100) : 0;
          const lengkap = jumlah > 0 && sudah === jumlah;
          const terbaik = Math.max(0, ...g.anggota.map((a) => a.streak ?? 0));
          const urut = [...g.anggota].sort(
            (a, b) =>
              (a.peran === "owner" ? 0 : a.peran === "admin" ? 1 : 2) -
                (b.peran === "owner" ? 0 : b.peran === "admin" ? 1 : 2) ||
              (b.streak ?? 0) - (a.streak ?? 0)
          );

          return (
            <section
              key={id}
              data-grup={id}
              className="overflow-hidden rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]"
            >
              <div className="flex items-start gap-3 px-4 pb-3 pt-4">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[linear-gradient(160deg,#963296,#6b2a55)] text-[13.5px] font-bold text-white shadow-[0_5px_14px_-8px_rgba(74,35,82,0.9)]"
                >
                  {inisial(g.nama)}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[15px] font-bold text-plum">{g.nama}</h2>
                  <p className="text-[11.5px] text-tinta-3">
                    {jumlah} anggota · beruntun terbaik {terbaik} hari
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                    lengkap ? "bg-baca-ya text-[#1f6b48]" : "bg-lavender text-ungu"
                  }`}
                  title="Anggota yang sudah baca hari ini"
                >
                  {sudah}/{jumlah} baca
                </span>
              </div>

              <div className="px-4 pb-3">
                <div className="h-2 overflow-hidden rounded-full bg-krem-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      lengkap
                        ? "bg-[linear-gradient(90deg,#2f9e6a,#48c78e)]"
                        : "bg-[linear-gradient(90deg,#963296,#c07ad0)]"
                    }`}
                    style={{ width: `${persen}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-tinta-3">
                  {persen}% sudah baca hari ini
                  {lengkap ? " — semua anggota lengkap." : ""}
                </p>
              </div>

              <ul className="border-t border-garis-tipis">
                {urut.map((a) => {
                  const bintang = a.minggu ?? Array<boolean>(7).fill(false);
                  return (
                    <li
                      key={a.user_id}
                      data-user={a.user_id}
                      data-peran={a.peran}
                      data-status={a.hari_ini ? "sudah" : "belum"}
                      data-streak={a.streak}
                      data-bintang={bintang.map((b) => (b ? "1" : "0")).join("")}
                      className="flex items-center gap-2.5 border-b border-garis-tipis px-4 py-2 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10.5px] font-bold ${
                          a.hari_ini ? "bg-baca-ya text-[#1f6b48]" : "bg-baca-tidak text-tinta-3"
                        }`}
                      >
                        {inisial(a.nama)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate text-[12.5px] ${
                            a.peran === "owner"
                              ? "font-bold text-tinta"
                              : a.peran === "admin"
                                ? "font-semibold text-tinta"
                                : "font-medium text-tinta-2"
                          }`}
                        >
                          {a.nama}
                          {a.peran !== "member" && (
                            <span
                              aria-hidden
                              title={a.peran === "owner" ? "Pemilik" : "Admin grup"}
                              className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
                                a.peran === "owner" ? "bg-plum" : "bg-ungu"
                              }`}
                            />
                          )}
                        </p>
                        <p className="text-[10.5px] text-tinta-3">
                          {a.hari_ini ? "sudah baca" : "belum baca"} · {a.total_selesai} total
                        </p>
                      </div>
                      <span
                        title="Bintang minggu ini (Minggu–Sabtu)"
                        className="flex shrink-0 items-center gap-[2px] text-[13px] leading-none"
                      >
                        {bintang.map((b, i) => (
                          <span
                            key={i}
                            title={`${HARI[i]}: ${b ? "sudah dibaca" : "belum"}`}
                            className={b ? "text-bintang-nyala" : "text-bintang-padam"}
                          >
                            ★
                          </span>
                        ))}
                      </span>
                      <span
                        title="Baca beruntun sampai hari ini"
                        className="w-7 shrink-0 text-right text-[11.5px] font-bold tabular-nums text-jingga"
                      >
                        {a.streak}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {grup.size === 0 && !error && (
          <p className="rounded-2xl border border-garis-tipis bg-kertas px-4 py-8 text-center text-[13.5px] text-tinta-2 lg:col-span-2">
            Belum ada grup di situs.
          </p>
        )}
      </div>

      {/* ===== Aktivitas ===== */}
      <section className="rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
        <div className="border-b border-garis-tipis px-4 py-3">
          <h2 className="text-[14px] font-bold text-plum">Aktivitas terakhir</h2>
          <p className="mt-0.5 text-[11.5px] text-tinta-3">
            50 kejadian terakhir: pendaftaran, grup dibuat/ditinggalkan, ganti nama, bacaan dibuka.
          </p>
        </div>
        {aktivitas.length > 0 ? (
          <ul className="divide-y divide-garis-tipis">
            {aktivitas.map((a) => {
              const nama =
                a.jenis === "daftar"
                  ? ""
                  : (a.user_id ? namaUser.get(a.user_id) : undefined) ?? "Seseorang";
              const grupNama = a.grup_id ? namaGrup(a.grup_id) : "";
              return (
                <li
                  key={a.id}
                  data-aktivitas={a.jenis}
                  className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span
                      aria-hidden
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[10px] font-bold ${
                        WARNA_JENIS[a.jenis] ?? "bg-krem-2 text-tinta-2"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${TITIK_JENIS[a.jenis] ?? "bg-tinta-3"}`} />
                    </span>
                    <span className="min-w-0 truncate text-[12.5px] text-tinta-2">
                      {kalimat(a, nama, grupNama)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-tinta-3">{jam(a.terjadi_at)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-4 py-6 text-[13px] text-tinta-3">Belum ada catatan aktivitas.</p>
        )}
      </section>
    </div>
  );
}
