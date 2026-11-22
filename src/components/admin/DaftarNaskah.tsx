"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import { IkonCari } from "@/components/Ikon";
import { IkonHati } from "@/components/Ikon";
import { IkonTulis } from "@/components/admin/IkonAdmin";
import { LencanaStatus } from "@/components/admin/Kepala";

export type BarisNaskah = {
  id: string;
  slug: string;
  title: string;
  devotion_date: string;
  status: string;
  hearts_count: number | null;
  theme: string | null;
};

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

function labelBulan(kunci: string) {
  const [th, bl] = kunci.split("-");
  return `${BULAN[parseInt(bl, 10) - 1]} ${th}`;
}

const SARING = [
  { kunci: "semua", label: "Semua" },
  { kunci: "published", label: "Terbit" },
  { kunci: "scheduled", label: "Terjadwal" },
  { kunci: "draft", label: "Draft" },
];

export default function DaftarNaskah({ baris }: { baris: BarisNaskah[] }) {
  const [cari, setCari] = useState("");
  const [status, setStatus] = useState("semua");
  const [bulan, setBulan] = useState("semua");

  const bulanTersedia = useMemo(() => {
    const set = new Set(baris.map((b) => b.devotion_date.slice(0, 7)));
    return [...set].sort().reverse();
  }, [baris]);

  const jumlahPerStatus = useMemo(() => {
    const n: Record<string, number> = { semua: baris.length, published: 0, scheduled: 0, draft: 0 };
    for (const b of baris) n[b.status] = (n[b.status] ?? 0) + 1;
    return n;
  }, [baris]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    return baris.filter((b) => {
      if (status !== "semua" && b.status !== status) return false;
      if (bulan !== "semua" && !b.devotion_date.startsWith(bulan)) return false;
      if (q && !(b.title.toLowerCase().includes(q) || (b.theme ?? "").toLowerCase().includes(q))) return false;
      return true;
    });
  }, [baris, cari, status, bulan]);

  return (
    <div className="space-y-4">
      {/* ===== Alat saring ===== */}
      <div className="rounded-2xl border border-garis-tipis bg-kertas p-3 shadow-[var(--shadow-kartu)]">
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[200px] flex-1">
            <IkonCari className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-tinta-3" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari judul atau tema…"
              aria-label="Cari judul atau tema"
              className="w-full rounded-xl border border-garis bg-cream py-2 pl-9 pr-3 text-[13.5px] text-tinta outline-none transition focus:border-ungu/50 focus:ring-2 focus:ring-ungu/15"
            />
          </div>
          <select
            value={bulan}
            onChange={(e) => setBulan(e.target.value)}
            aria-label="Saring bulan"
            className="rounded-xl border border-garis bg-cream px-3 py-2 text-[13.5px] font-semibold text-tinta-2 outline-none focus:border-ungu/50"
          >
            <option value="semua">Semua bulan</option>
            {bulanTersedia.map((b) => (
              <option key={b} value={b}>
                {labelBulan(b)}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SARING.map((s) => {
            const nyala = status === s.kunci;
            const n = jumlahPerStatus[s.kunci] ?? 0;
            return (
              <button
                key={s.kunci}
                type="button"
                data-saring={s.kunci}
                data-nyala={nyala ? "ya" : "tidak"}
                onClick={() => setStatus(s.kunci)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[12px] font-semibold transition sm:py-1 ${
                  nyala
                    ? "bg-plum text-white shadow-[0_2px_6px_-2px_rgba(74,35,82,0.6)]"
                    : "bg-krem-2 text-tinta-2 hover:bg-krem-3"
                }`}
              >
                {s.label}
                <span className={`tabular-nums ${nyala ? "text-white/70" : "text-tinta-3"}`}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="px-1 text-[12px] text-tinta-3" data-hitung-naskah>
        Menampilkan <strong className="font-semibold text-tinta-2">{tampil.length}</strong> dari{" "}
        {baris.length} edisi terakhir
        {cari || status !== "semua" || bulan !== "semua" ? " (disaring)" : ""}.
      </p>

      {/* ===== Daftar ===== */}
      {tampil.length > 0 ? (
        <ul className="overflow-hidden rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
          {tampil.map((d) => (
            <li key={d.id} data-naskah={d.id} className="border-b border-garis-tipis last:border-b-0">
              <Link
                href={`/admin/saat-teduh/${d.slug}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-4 py-3 transition hover:bg-krem-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-tinta group-hover:text-plum">
                    {d.title}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-tinta-3">
                    <span>{formatTanggalID(d.devotion_date)}</span>
                    {d.theme && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-semibold text-ungu">{d.theme}</span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums text-tinta-3"
                    title="Jumlah hati"
                  >
                    <IkonHati className="h-[13px] w-[13px] opacity-80" />
                    {d.hearts_count ?? 0}
                  </span>
                  <LencanaStatus status={d.status} />
                  <span className="hidden text-[12px] font-semibold text-ungu sm:inline">Edit</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-garis-tipis bg-kertas px-4 py-10 text-center shadow-[var(--shadow-kartu)]">
          <p className="text-[14px] font-semibold text-plum">Tidak ada naskah yang cocok</p>
          <p className="mt-1 text-[13px] text-tinta-2">
            Ubah kata kunci, bulan, atau status saringan.
          </p>
          <button
            type="button"
            onClick={() => {
              setCari("");
              setStatus("semua");
              setBulan("semua");
            }}
            className="btn btn-halus btn-sm mt-3"
          >
            Bersihkan saringan
          </button>
        </div>
      )}

      <p className="flex items-center gap-1.5 px-1 text-[11.5px] text-tinta-3">
        <IkonTulis className="h-[13px] w-[13px]" />
        Daftar memuat 100 edisi terbaru. Untuk edisi lebih lama, pakai arsip di situs publik.
      </p>
    </div>
  );
}
