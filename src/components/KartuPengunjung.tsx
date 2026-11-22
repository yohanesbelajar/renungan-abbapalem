// Kartu angka pengunjung — HANYA dirender kalau peran pemanggil `superadmin`.
// Pemeriksaan peran ada di halaman (server), bukan di sini; komponen ini tidak
// pernah tahu apa pun tentang pengguna.
import { formatTanggalID } from "@/lib/dates";
import type { RingkasanPengunjung } from "@/lib/pengunjung";
import { IkonOrang } from "@/components/admin/IkonAdmin";

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
      tinggi: Math.max(3, Math.round((h.jumlah / puncak) * 64)),
      label: new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        day: "numeric",
        month: "short",
      }).format(new Date(`${h.hari}T00:00:00+07:00`)),
    }));
}

export default function KartuPengunjung({ data }: { data: RingkasanPengunjung }) {
  const kolom = batang(data.harian);
  const puncak = Math.max(1, ...kolom.map((k) => k.jumlah));

  return (
    <section
      data-kartu-pengunjung
      className="rounded-2xl border border-garis-tipis bg-kertas p-4 shadow-[var(--shadow-kartu)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-lavender text-ungu">
            <IkonOrang className="h-[15px] w-[15px]" />
          </span>
          <div>
            <h2 className="text-[14px] font-bold text-plum">Pengunjung website</h2>
            <p className="text-[11.5px] text-tinta-3">
              khusus super admin · hari ini {formatTanggalID(data.harian[0]?.hari ?? "")}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-krem-2 px-2.5 py-1 text-[11px] font-semibold text-tinta-2">
          {angka(data.hariTercatat)} hari tercatat · {angka(data.total)} total
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { label: "Hari ini", nilai: data.hariIni, utama: true },
          { label: "Kemarin", nilai: data.kemarin },
          { label: "7 hari", nilai: data.tujuhHari },
          { label: "30 hari", nilai: data.tigaPuluhHari },
        ].map((k) => (
          <div
            key={k.label}
            className={`rounded-xl border px-3 py-2.5 ${
              k.utama ? "border-[#963296]/25 bg-lavender" : "border-garis-tipis bg-krem-2/60"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-tinta-2">
              {k.label}
            </p>
            <p
              className={`mt-0.5 text-[22px] font-bold leading-none tabular-nums ${
                k.utama ? "text-plum" : "text-tinta"
              }`}
            >
              {angka(k.nilai)}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-tinta-3">
            14 hari terakhir
          </p>
          <p className="text-[11px] text-tinta-3">puncak {angka(puncak)}/hari</p>
        </div>
        <div className="mt-2 flex h-[72px] items-end gap-1.5">
          {kolom.map((k, i) => {
            const hariIni = i === kolom.length - 1;
            return (
              <div key={k.hari} className="group flex h-[72px] flex-1 flex-col justify-end">
                <div
                  className={`w-full rounded-t-md transition ${
                    hariIni
                      ? "bg-[linear-gradient(180deg,#963296,#7a2679)]"
                      : "bg-[#963296]/40 group-hover:bg-[#963296]/70"
                  }`}
                  style={{ height: `${k.tinggi}px` }}
                  title={`${k.label}: ${angka(k.jumlah)} pengunjung`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[10.5px] text-tinta-3">
          <span>{kolom[0]?.label}</span>
          <span>hari ini</span>
        </div>
      </div>

      {data.galat && (
        <p className="mt-3 rounded-xl border border-senja/30 bg-senja/10 px-3 py-2 text-[11.5px] leading-relaxed text-jingga">
          Sebagian angka gagal dibaca dari penyimpanan — angka yang tampil bisa lebih kecil dari
          sebenarnya.
        </p>
      )}
    </section>
  );
}
