import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { BarisKomunitas } from "@/app/grup/page";

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
    case "ubah_nama":
      return `${nama} mengganti nama → ${a.keterangan ?? "-"}`;
    case "baca":
      return `${nama} membaca “${a.keterangan ?? "saat teduh"}”`;
    default:
      return a.jenis;
  }
}

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

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Pantau Grup</h1>
      <p className="mt-1 text-sm text-slate-500">
        Seluruh grup di situs — tanpa perlu menjadi anggotanya. Hanya bisa
        dibuka oleh akun Anda; halaman ini tidak punya tombol ubah atau hapus.
      </p>

      {error && (
        <p className="mt-4 rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat data: {error.message}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-plum">
          {grup.size} grup
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
          {totalAnggota} keanggotaan
        </span>
        <span className="rounded-full bg-baca-ya px-3 py-1 text-slate-700">
          {sudahBaca} sudah baca hari ini
        </span>
      </div>

      <div className="mt-6 space-y-4">
        {[...grup.entries()].map(([id, g]) => {
          const sudah = g.anggota.filter((a) => a.hari_ini).length;
          return (
            <div
              key={id}
              data-grup={id}
              className="overflow-hidden rounded-2xl border border-garis-tipis bg-kertas"
            >
              <div className="flex items-center justify-between border-b border-garis-tipis bg-krem-2 px-4 py-3">
                <span className="font-semibold text-plum">{g.nama}</span>
                <span className="text-xs text-tinta-3">
                  {g.anggota.length} anggota · {sudah} baca hari ini
                </span>
              </div>
              <ul className="divide-y divide-garis-tipis">
                {g.anggota.map((a) => {
                  const bintang = a.minggu ?? Array<boolean>(7).fill(false);
                  return (
                    <li
                      key={a.user_id}
                      data-user={a.user_id}
                      data-peran={a.peran}
                      data-status={a.hari_ini ? "sudah" : "belum"}
                      data-streak={a.streak}
                      data-bintang={bintang.map((b) => (b ? "1" : "0")).join("")}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5"
                    >
                      <span
                        className={`inline-block max-w-full truncate rounded-md px-2 py-0.5 text-sm ${
                          a.peran === "owner"
                            ? "font-bold"
                            : a.peran === "admin"
                              ? "font-semibold"
                              : "font-medium"
                        } ${a.hari_ini ? "bg-baca-ya" : "bg-baca-tidak"}`}
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
                      <span className="ml-auto flex shrink-0 items-center gap-2">
                        <span
                          title="Bintang minggu ini (Minggu–Sabtu)"
                          className="flex items-center gap-[2px] text-[15px] leading-none"
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
                          className="min-w-6 text-right text-sm font-semibold text-senja"
                        >
                          {a.streak}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
        {grup.size === 0 && !error && (
          <p className="text-sm text-slate-500">Belum ada grup di situs.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-slate-900">Aktivitas terakhir</h2>
        <p className="mt-1 text-xs text-slate-500">
          50 kejadian terakhir: pendaftaran, grup dibuat/ditinggalkan, ganti
          nama, renungan dibaca.
        </p>
        {aktivitas.length > 0 ? (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
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
                  className="flex flex-wrap items-baseline justify-between gap-x-3 px-3 py-2 text-sm"
                >
                  <span className="text-slate-700">{kalimat(a, nama, grupNama)}</span>
                  <span className="text-xs text-slate-400">{jam(a.terjadi_at)}</span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Belum ada catatan aktivitas.</p>
        )}
      </div>
    </div>
  );
}
