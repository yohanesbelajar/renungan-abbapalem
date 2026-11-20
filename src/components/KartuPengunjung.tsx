// Kartu angka pengunjung — HANYA dirender kalau peran pemanggil `superadmin`.
// Pemeriksaan peran ada di halaman (server), bukan di sini; komponen ini tidak
// pernah tahu apa pun tentang pengguna.
import { formatTanggalID } from "@/lib/dates";
import type { RingkasanPengunjung } from "@/lib/pengunjung";

function angka(n: number): string {
  return new Intl.NumberFormat("id-ID").format(n);
}

function batang(harian: { hari: string; jumlah: number }[]) {
  const puncak = Math.max(1, ...harian.map((h) => h.jumlah));
  return harian
    .slice()
    .reverse()
    .map((h) => ({
      ...h,
      tinggi: Math.max(2, Math.round((h.jumlah / puncak) * 56)),
      label: new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
      }).format(new Date(`${h.hari}T00:00:00+07:00`)),
    }));
}

export default function KartuPengunjung({ data }: { data: RingkasanPengunjung }) {
  const kolom = batang(data.harian);
  return (
    <div className="mt-6 rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-700">Pengunjung website</h2>
        <span className="text-xs text-slate-500">
          khusus super admin · hari ini {formatTanggalID(data.harian[0]?.hari ?? "")}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Hari ini", nilai: data.hariIni, utama: true },
          { label: "Kemarin", nilai: data.kemarin },
          { label: "7 hari", nilai: data.tujuhHari },
          { label: "30 hari", nilai: data.tigaPuluhHari },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-lg border p-3 ${
              k.utama ? "border-[#9B3F76]/30 bg-[#9B3F76]/5" : "border-slate-200"
            }`}
          >
            <p className="text-xs text-slate-500">{k.label}</p>
            <p
              className={`mt-0.5 text-2xl font-bold tabular-nums ${
                k.utama ? "text-[#9B3F76]" : "text-slate-800"
              }`}
            >
              {angka(k.nilai)}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-sm text-slate-600">
        Total tercatat sejak pencatat dipasang:{" "}
        <span className="font-semibold text-slate-800">{angka(data.total)}</span> pengunjung ·{" "}
        {data.hariTercatat} hari ada kunjungan
      </p>

      <div className="mt-4">
        <p className="text-xs text-slate-500">14 hari terakhir (pengunjung unik per hari)</p>
        <div className="mt-2 flex h-16 items-end gap-1.5">
          {kolom.map((k) => (
            <div key={k.hari} className="group flex h-16 flex-1 flex-col justify-end">
              <div
                className="w-full rounded-t bg-[#9B3F76]/70 transition group-hover:bg-[#9B3F76]"
                style={{ height: `${k.tinggi}px` }}
                title={`${k.label}: ${angka(k.jumlah)} pengunjung`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          <span>{kolom[0]?.label}</span>
          <span>{kolom[kolom.length - 1]?.label}</span>
        </div>
      </div>

      {data.galat && (
        <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Sebagian angka gagal dibaca dari penyimpanan — angka yang tampil bisa lebih kecil dari
          sebenarnya.
        </p>
      )}
    </div>
  );
}
