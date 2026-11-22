import { createClient } from "@/lib/supabase/server";
import { formatTanggalID } from "@/lib/dates";
import Kepala, { KotakAngka } from "@/components/admin/Kepala";
import RincianStatistik from "@/components/admin/RincianStatistik";
import { IkonBuku, IkonHati } from "@/components/Ikon";
import { IkonCentang } from "@/components/admin/IkonAdmin";

export const dynamic = "force-dynamic";

type Baris = {
  id: string;
  title: string;
  devotion_date: string;
  hearts_count: number | null;
  selesai_dibaca: number | null;
};

function angka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

/** "2026-11" → "November 2026" */
function labelBulan(kunci: string): string {
  const [th, bl] = kunci.split("-");
  const nama = new Intl.DateTimeFormat("id-ID", { month: "long" }).format(
    new Date(Number(th), Number(bl) - 1, 1)
  );
  return `${nama} ${th}`;
}

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_stats")
    .select("id, title, devotion_date, hearts_count, selesai_dibaca")
    .order("devotion_date", { ascending: false })
    .limit(200);

  const baris = (data ?? []) as Baris[];

  const totalHati = baris.reduce((n, b) => n + (b.hearts_count ?? 0), 0);
  const totalSelesai = baris.reduce((n, b) => n + (b.selesai_dibaca ?? 0), 0);

  // Kelompok per bulan (200 edisi terakhir ≈ 6–7 bulan).
  const bulanan = new Map<string, { hati: number; selesai: number; n: number }>();
  for (const b of baris) {
    const k = b.devotion_date.slice(0, 7);
    const m = bulanan.get(k) ?? { hati: 0, selesai: 0, n: 0 };
    m.hati += b.hearts_count ?? 0;
    m.selesai += b.selesai_dibaca ?? 0;
    m.n += 1;
    bulanan.set(k, m);
  }
  const bulanUrut = [...bulanan.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)).slice(0, 6);

  const teratas = [...baris]
    .sort((a, b) => (b.selesai_dibaca ?? 0) - (a.selesai_dibaca ?? 0))
    .filter((b) => (b.selesai_dibaca ?? 0) > 0)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      <Kepala
        label="Angka"
        judul="Statistik"
        keterangan={`Hati dan penanda selesai pada ${baris.length} edisi terakhir. Angka mengikuti catatan pembaca, bukan tayangan halaman.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KotakAngka label="Total hati" nilai={angka(totalHati)} Ikon={IkonHati} nada="senja" />
        <KotakAngka label="Selesai dibaca" nilai={angka(totalSelesai)} Ikon={IkonCentang} nada="hijau" />
        <KotakAngka
          label="Rata-rata selesai/edisi"
          nilai={
            baris.length
              ? (totalSelesai / baris.length).toLocaleString("id-ID", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })
              : "0"
          }
          Ikon={IkonBuku}
          nada="ungu"
        />
      </div>

      {bulanan.size > 0 && (
        <section className="rounded-2xl border border-garis-tipis bg-kertas p-4 shadow-[var(--shadow-kartu)]">
          <h2 className="text-[14px] font-bold text-plum">Per bulan</h2>
          <p className="mt-0.5 text-[11.5px] text-tinta-3">Enam bulan terakhir dalam daftar ini.</p>

          <div className="mt-3 space-y-2.5">
            {bulanUrut.map(([kunci, m]) => {
              const lebarHati = Math.round((m.hati / Math.max(1, ...bulanUrut.map(([, x]) => x.hati || 1))) * 100);
              const lebarSelesai = Math.round((m.selesai / Math.max(1, ...bulanUrut.map(([, x]) => x.selesai || 1))) * 100);
              return (
                <div key={kunci} data-bulan={kunci}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="font-semibold text-tinta">{labelBulan(kunci)}</span>
                    <span className="text-[11.5px] tabular-nums text-tinta-3">
                      {m.n} edisi · ♥ {angka(m.hati)} · ✓ {angka(m.selesai)}
                    </span>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    <div className="h-1.5 overflow-hidden rounded-full bg-krem-3">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#f7c274,#e08a00)]"
                        style={{ width: `${m.hati > 0 ? Math.max(3, lebarHati) : 0}%` }}
                      />
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-krem-3">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#48c78e,#2f9e6a)]"
                        style={{ width: `${m.selesai > 0 ? Math.max(3, lebarSelesai) : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-tinta-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#e08a00]" /> hati
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-[#2f9e6a]" /> selesai dibaca
            </span>
          </p>
        </section>
      )}

      {teratas.length > 0 && (
        <section className="rounded-2xl border border-garis-tipis bg-kertas p-4 shadow-[var(--shadow-kartu)]">
          <h2 className="text-[14px] font-bold text-plum">Paling banyak diselesaikan</h2>
          <ul className="mt-2.5 space-y-2">
            {teratas.map((b, i) => (
              <li key={b.id} data-teratas={b.id} className="flex items-center gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lavender text-[11.5px] font-bold text-ungu">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-tinta">{b.title}</p>
                  <p className="text-[11px] text-tinta-3">{formatTanggalID(b.devotion_date)}</p>
                </div>
                <span className="shrink-0 text-[12.5px] font-bold tabular-nums text-[#1f6b48]">
                  {angka(b.selesai_dibaca ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {baris.length > 0 ? (
        <RincianStatistik baris={baris} />
      ) : (
        <p className="rounded-2xl border border-garis-tipis bg-kertas px-4 py-8 text-center text-[13.5px] text-tinta-2">
          Belum ada data statistik.
        </p>
      )}
    </div>
  );
}
