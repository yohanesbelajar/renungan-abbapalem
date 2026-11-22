"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RoleSelect from "@/components/RoleSelect";

export type BarisPengguna = {
  id: string;
  nama: string;
  email: string;
  peran: string;
  status: string;
  status_at: string | null;
  alasan: string | null;
  dibuat: string;
  jumlah_grup: number;
};

function tanggal(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Kelola pengguna: ubah peran, tendang (bisa dipulihkan), hapus permanen
// (khusus superadmin, wajib mengetik nama). Semua aturan izin ditegakkan
// ulang di database; tombol di sini hanya menyesuaikan tampilan.
export default function KelolaPengguna({
  baris,
  sayaId,
  sayaPeran,
}: {
  baris: BarisPengguna[];
  sayaId: string;
  sayaPeran: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [pesan, setPesan] = useState<{ id: string; teks: string; galat: boolean } | null>(null);
  const [konfirmasiHapus, setKonfirmasiHapus] = useState<string | null>(null);
  const [ketikan, setKetikan] = useState("");

  const superadmin = sayaPeran === "superadmin";

  async function tendang(u: BarisPengguna) {
    const yakin = window.confirm(
      `Tendang akun "${u.nama}" (${u.email})?\n\n` +
        `Login diblokir dan sesinya diputus. Data bacaan, riwayat, dan keanggotaan grupnya ` +
        `TETAP tersimpan, dan akun bisa dipulihkan kapan saja dari halaman ini.`
    );
    if (!yakin) return;
    setSibuk(u.id);
    setPesan(null);
    const { error } = await supabase.rpc("tendang_pengguna", {
      p_user: u.id,
      p_alasan: null,
    });
    setSibuk(null);
    if (error) {
      setPesan({ id: u.id, teks: error.message, galat: true });
      return;
    }
    setPesan({ id: u.id, teks: "Akun ditendang. Login diblokir.", galat: false });
    router.refresh();
  }

  async function pulihkan(u: BarisPengguna) {
    setSibuk(u.id);
    setPesan(null);
    const { error } = await supabase.rpc("pulihkan_pengguna", { p_user: u.id });
    setSibuk(null);
    if (error) {
      setPesan({ id: u.id, teks: error.message, galat: true });
      return;
    }
    setPesan({ id: u.id, teks: "Akun dipulihkan — bisa masuk lagi.", galat: false });
    router.refresh();
  }

  async function hapus(u: BarisPengguna) {
    setSibuk(u.id);
    setPesan(null);
    const { error } = await supabase.rpc("hapus_pengguna", { p_user: u.id });
    setSibuk(null);
    if (error) {
      setPesan({ id: u.id, teks: error.message, galat: true });
      return;
    }
    setKonfirmasiHapus(null);
    setKetikan("");
    router.refresh();
  }

  return (
    <>
      {pesan && (
        <p
          className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
            pesan.galat
              ? "border-merah/30 bg-merah/5 text-merah"
              : "border-baca-ya bg-baca-ya/40 text-[#1f6b48]"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <ul className="mt-4 divide-y divide-slate-100 rounded-xl border border-garis-tipis">
        {baris.map((u) => {
          const diri = u.id === sayaId;
          const ditendang = u.status === "ditendang";
          const kunciPeran = u.peran === "superadmin" && !superadmin;
          const bolehTendang =
            !diri && u.peran !== "superadmin" && (u.peran !== "admin" || superadmin);
          return (
            <li key={u.id} data-user={u.id} data-status={u.status} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                    <span className="truncate">{u.nama}</span>
                    {diri && (
                      <span className="rounded-full bg-lavender px-1.5 py-px text-[10.5px] font-semibold text-ungu">
                        Anda
                      </span>
                    )}
                    {ditendang && (
                      <span
                        data-lencana="ditendang"
                        className="rounded-full bg-merah/10 px-1.5 py-px text-[10.5px] font-semibold text-merah"
                      >
                        ditendang
                      </span>
                    )}
                    {u.peran === "superadmin" && (
                      <span className="rounded-full bg-plum/10 px-1.5 py-px text-[10.5px] font-semibold text-plum">
                        super admin
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{u.email}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {u.jumlah_grup} grup · daftar {tanggal(u.dibuat)}
                    {ditendang && u.status_at ? ` · ditendang ${tanggal(u.status_at)}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {kunciPeran ? (
                    <span className="text-xs text-slate-400">peran terkunci</span>
                  ) : (
                    <RoleSelect userId={u.id} role={u.peran} canSuper={superadmin} />
                  )}

                  {bolehTendang &&
                    (ditendang ? (
                      <button
                        type="button"
                        data-pulihkan={u.id}
                        disabled={sibuk === u.id}
                        onClick={() => pulihkan(u)}
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {sibuk === u.id ? "Memulihkan…" : "Pulihkan"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-tendang={u.id}
                        disabled={sibuk === u.id}
                        onClick={() => tendang(u)}
                        className="rounded-lg border border-merah/40 px-2.5 py-1.5 text-xs font-semibold text-merah hover:bg-merah/5 disabled:opacity-50"
                      >
                        {sibuk === u.id ? "Menendang…" : "Tendang"}
                      </button>
                    ))}

                  {superadmin && !diri && u.peran !== "superadmin" && (
                    <button
                      type="button"
                      data-hapus={u.id}
                      onClick={() => {
                        setKonfirmasiHapus(konfirmasiHapus === u.id ? null : u.id);
                        setKetikan("");
                      }}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-merah"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {konfirmasiHapus === u.id && (
                <div className="mt-3 rounded-xl border border-merah/30 bg-merah/5 p-3">
                  <p className="text-[12.5px] leading-relaxed text-slate-700">
                    <strong className="font-semibold text-merah">Hapus permanen {u.nama}.</strong>{" "}
                    Akun, profil, keanggotaan grup, favorit, dan seluruh catatan bacaan orang ini
                    hilang dan <strong>tidak bisa dikembalikan</strong>. Kalau hanya ingin
                    memblokir login, pakai <em>Tendang</em>.
                  </p>
                  <p className="mt-2 text-[12px] text-slate-600">
                    Ketik <strong className="font-semibold">{u.nama}</strong> untuk mengonfirmasi:
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      data-konfirmasi-hapus={u.id}
                      value={ketikan}
                      onChange={(e) => setKetikan(e.target.value)}
                      className="w-52 rounded border border-slate-300 px-2 py-1.5 text-sm"
                      placeholder={u.nama}
                      aria-label="Ketik nama untuk konfirmasi hapus"
                    />
                    <button
                      type="button"
                      data-konfirmasi-tombol={u.id}
                      disabled={ketikan.trim() !== u.nama || sibuk === u.id}
                      onClick={() => hapus(u)}
                      className="rounded-lg bg-merah px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      {sibuk === u.id ? "Menghapus…" : "Hapus permanen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKonfirmasiHapus(null);
                        setKetikan("");
                      }}
                      className="text-xs font-semibold text-slate-500 hover:underline"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
