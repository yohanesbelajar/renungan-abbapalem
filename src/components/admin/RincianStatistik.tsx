"use client";

import { useState } from "react";
import { formatTanggalID } from "@/lib/dates";
import { IkonHati } from "@/components/Ikon";
import { IkonCentang } from "@/components/admin/IkonAdmin";

export type BarisStat = {
  id: string;
  title: string;
  devotion_date: string;
  hearts_count: number | null;
  selesai_dibaca: number | null;
};

function angka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** Rincian per edisi — dibatasi 25 baris supaya halaman tidak jadi gulungan raksasa. */
export default function RincianStatistik({ baris }: { baris: BarisStat[] }) {
  const [semua, setSemua] = useState(false);
  const maksSelesai = Math.max(1, ...baris.map((b) => b.selesai_dibaca ?? 0));
  const maksHati = Math.max(1, ...baris.map((b) => b.hearts_count ?? 0));
  const tampil = semua ? baris : baris.slice(0, 25);

  return (
    <section className="overflow-hidden rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-garis-tipis px-4 py-3">
        <div>
          <h2 className="text-[14px] font-bold text-plum">Rincian per edisi</h2>
          <p className="mt-0.5 text-[11.5px] text-tinta-3">
            Batang hijau = selesai dibaca, jingga = hati; angkanya di sisi kanan.
          </p>
        </div>
        <span className="rounded-full bg-krem-2 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-tinta-2">
          {tampil.length} / {baris.length} edisi
        </span>
      </div>

      <ul className="divide-y divide-garis-tipis">
        {tampil.map((s) => {
          const hati = s.hearts_count ?? 0;
          const selesai = s.selesai_dibaca ?? 0;
          return (
            <li
              key={s.id}
              data-stats={s.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-tinta">{s.title}</p>
                <p className="text-[11.5px] text-tinta-3">{formatTanggalID(s.devotion_date)}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden w-28 sm:block" aria-hidden>
                  <div className="h-1.5 overflow-hidden rounded-full bg-krem-3">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#48c78e,#2f9e6a)]"
                      style={{ width: `${Math.round((selesai / maksSelesai) * 100)}%` }}
                    />
                  </div>
                </div>
                <span
                  title="Selesai dibaca"
                  className="inline-flex min-w-[46px] items-center justify-end gap-1 text-[12.5px] font-semibold tabular-nums text-[#1f6b48]"
                >
                  <IkonCentang className="h-[13px] w-[13px]" />
                  {angka(selesai)}
                </span>
                <span
                  title="Hati"
                  className="inline-flex min-w-[46px] items-center justify-end gap-1 text-[12.5px] font-semibold tabular-nums text-jingga"
                >
                  <IkonHati className="h-[13px] w-[13px]" />
                  {angka(hati)}
                </span>
              </div>
              <div className="col-span-2 sm:hidden" aria-hidden>
                <div className="h-1.5 overflow-hidden rounded-full bg-krem-3">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#f7c274,#e08a00)]"
                    style={{ width: `${Math.round((hati / maksHati) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {baris.length > 25 && (
        <div className="border-t border-garis-tipis px-4 py-3 text-center">
          <button type="button" onClick={() => setSemua((v) => !v)} className="btn btn-halus btn-sm">
            {semua ? "Tampilkan 25 terbaru" : `Tampilkan semua (${baris.length})`}
          </button>
        </div>
      )}
    </section>
  );
}
