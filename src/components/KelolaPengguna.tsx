"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import RoleSelect from "@/components/RoleSelect";
import { IkonCari } from "@/components/Ikon";
import { IkonOrang } from "@/components/admin/IkonAdmin";

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

const LABEL_PERAN: Record<string, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  editor: "Editor",
  member: "Anggota",
};

function inisial(nama: string): string {
  const b = nama.trim().split(/\s+/).filter(Boolean);
  if (!b.length) return "?";
  return (b[0][0] + (b.length > 1 ? b[b.length - 1][0] : "")).toUpperCase();
}

const SARING = [
  { kunci: "semua", label: "Semua" },
  { kunci: "ditendang", label: "Ditendang" },
  { kunci: "staf", label: "Staf" },
  { kunci: "member", label: "Anggota" },
];

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
  const [cari, setCari] = useState("");
  const [saring, setSaring] = useState("semua");

  const superadmin = sayaPeran === "superadmin";

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return baris.filter((u) => {
      if (saring === "ditendang" && u.status !== "ditendang") return false;
      if (saring === "staf" && !["admin", "superadmin", "editor"].includes(u.peran)) return false;
      if (saring === "member" && u.peran !== "member") return false;
      if (q && !(u.nama.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [baris, cari, saring]);

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
      {/* ===== Pencarian & saringan ===== */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[190px] flex-1">
          <IkonCari className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-tinta-3" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau email…"
            aria-label="Cari pengguna"
            className="w-full rounded-xl border border-garis bg-kertas py-2 pl-9 pr-3 text-[13.5px] text-tinta outline-none transition focus:border-ungu/50 focus:ring-2 focus:ring-ungu/15"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {SARING.map((s) => {
            const nyala = saring === s.kunci;
            return (
              <button
                key={s.kunci}
                type="button"
                data-saring-pengguna={s.kunci}
                data-nyala={nyala ? "ya" : "tidak"}
                onClick={() => setSaring(s.kunci)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                  nyala ? "bg-plum text-white" : "bg-krem-2 text-tinta-2 hover:bg-krem-3"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {pesan && (
        <p
          className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
            pesan.galat
              ? "border-merah/30 bg-merah/5 text-merah"
              : "border-baca-ya bg-baca-ya/40 text-[#1f6b48]"
          }`}
        >
          {pesan.teks}
        </p>
      )}

      <ul className="mt-3 space-y-2">
        {tampil.map((u) => {
          const diri = u.id === sayaId;
          const ditendang = u.status === "ditendang";
          const kunciPeran = u.peran === "superadmin" && !superadmin;
          const bolehTendang =
            !diri && u.peran !== "superadmin" && (u.peran !== "admin" || superadmin);
          return (
            <li
              key={u.id}
              data-user={u.id}
              data-status={u.status}
              className={`rounded-2xl border bg-kertas p-3.5 shadow-[var(--shadow-kartu)] transition ${
                ditendang ? "border-merah/25 bg-merah/[0.02]" : "border-garis-tipis"
              }`}
            >
              <div className="flex flex-wrap items-start gap-3">
                <span
                  aria-hidden
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-bold ${
                    ditendang ? "bg-merah/10 text-merah" : "bg-lavender text-ungu"
                  }`}
                >
                  {inisial(u.nama)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-tinta">
                    <span className="truncate">{u.nama}</span>
                    {diri && (
                      <span className="rounded-full bg-lavender px-1.5 py-px text-[10.5px] font-semibold text-ungu">
                        Anda
                      </span>
                    )}
                    {ditendang && (
                      <span
                        data-lencana="ditendang"
                        className="rounded-full bg-merah/10 px-1.5 py-px text-[10.5px] font-bold uppercase tracking-[0.05em] text-merah"
                      >
                        ditendang
                      </span>
                    )}
                    {u.peran === "superadmin" && (
                      <span className="rounded-full bg-plum/10 px-1.5 py-px text-[10.5px] font-bold uppercase tracking-[0.05em] text-plum">
                        super admin
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-tinta-2">{u.email}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-tinta-3">
                    <span className="font-semibold text-tinta-2">{LABEL_PERAN[u.peran] ?? u.peran}</span>
                    <span aria-hidden>·</span>
                    <span>{u.jumlah_grup} grup</span>
                    <span aria-hidden>·</span>
                    <span>daftar {tanggal(u.dibuat)}</span>
                    {ditendang && u.status_at && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="text-merah">ditendang {tanggal(u.status_at)}</span>
                      </>
                    )}
                  </p>
                </div>

                <div className="ml-auto flex flex-wrap items-center gap-1.5">
                  {kunciPeran ? (
                    <span className="text-[11.5px] text-tinta-3">peran terkunci</span>
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
                        className="rounded-full bg-baca-ya px-3 py-1.5 text-[11.5px] font-bold text-[#1f6b48] transition hover:brightness-95 disabled:opacity-50"
                      >
                        {sibuk === u.id ? "Memulihkan…" : "Pulihkan"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-tendang={u.id}
                        disabled={sibuk === u.id}
                        onClick={() => tendang(u)}
                        className="rounded-full px-3 py-1.5 text-[11.5px] font-bold text-merah transition hover:bg-merah/10 disabled:opacity-50"
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
                      className="rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold text-tinta-3 transition hover:bg-merah/5 hover:text-merah"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>

              {konfirmasiHapus === u.id && (
                <div className="mt-3 rounded-xl border border-merah/30 bg-merah/5 p-3">
                  <p className="text-[12.5px] leading-relaxed text-tinta-2">
                    <strong className="font-semibold text-merah">Hapus permanen {u.nama}.</strong>{" "}
                    Akun, profil, keanggotaan grup, favorit, dan seluruh catatan bacaan orang ini
                    hilang dan <strong>tidak bisa dikembalikan</strong>. Kalau hanya ingin
                    memblokir login, pakai <em>Tendang</em>.
                  </p>
                  <p className="mt-2 text-[12px] text-tinta-2">
                    Ketik <strong className="font-semibold text-tinta">{u.nama}</strong> untuk
                    mengonfirmasi:
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      data-konfirmasi-hapus={u.id}
                      value={ketikan}
                      onChange={(e) => setKetikan(e.target.value)}
                      className="w-52 rounded-lg border border-merah/30 bg-kertas px-2.5 py-1.5 text-sm text-tinta outline-none focus:border-merah/60"
                      placeholder={u.nama}
                      aria-label="Ketik nama untuk konfirmasi hapus"
                    />
                    <button
                      type="button"
                      data-konfirmasi-tombol={u.id}
                      disabled={ketikan.trim() !== u.nama || sibuk === u.id}
                      onClick={() => hapus(u)}
                      className="rounded-full bg-merah px-3.5 py-1.5 text-[11.5px] font-bold text-white disabled:opacity-40"
                    >
                      {sibuk === u.id ? "Menghapus…" : "Hapus permanen"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setKonfirmasiHapus(null);
                        setKetikan("");
                      }}
                      className="text-[11.5px] font-semibold text-tinta-2 hover:underline"
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

      {tampil.length === 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl border border-garis-tipis bg-kertas px-4 py-8 text-[13px] text-tinta-2">
          <IkonOrang className="h-4 w-4 text-tinta-3" />
          Tidak ada pengguna yang cocok dengan saringan ini.
        </div>
      )}
    </>
  );
}
