import type { ReactNode } from "react";

/** Kepala halaman panel admin: label kecil, judul, keterangan, dan aksi kanan. */
export default function Kepala({
  label,
  judul,
  keterangan,
  aksi,
}: {
  label?: string;
  judul: string;
  keterangan?: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {label && <p className="label-kecil text-ungu">{label}</p>}
        <h1 className="judul-rapat-sm mt-1 text-[25px] text-plum sm:text-[29px]">{judul}</h1>
        {keterangan && (
          <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-tinta-2">{keterangan}</p>
        )}
      </div>
      {aksi && <div className="flex shrink-0 flex-wrap items-center gap-2">{aksi}</div>}
    </div>
  );
}

/** Kotak angka ringkas. */
export function KotakAngka({
  label,
  nilai,
  satuan,
  nada = "netral",
  Ikon,
}: {
  label: string;
  nilai: string | number;
  satuan?: string;
  nada?: "netral" | "ungu" | "hijau" | "senja";
  Ikon?: (p: { className?: string }) => React.ReactElement;
}) {
  const warna = {
    netral: "text-tinta",
    ungu: "text-plum",
    hijau: "text-[#1f6b48]",
    senja: "text-jingga",
  }[nada];
  const latar = {
    netral: "bg-krem-2 text-tinta-2",
    ungu: "bg-lavender text-ungu",
    hijau: "bg-baca-ya text-[#1f6b48]",
    senja: "bg-senja/15 text-jingga",
  }[nada];

  return (
    <div className="rounded-2xl border border-garis-tipis bg-kertas p-3.5 shadow-[var(--shadow-kartu)]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-tinta-2">{label}</p>
        {Ikon && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${latar}`}>
            <Ikon className="h-[15px] w-[15px]" />
          </span>
        )}
      </div>
      <p className={`mt-1.5 text-[26px] font-bold leading-none tabular-nums ${warna}`}>
        {nilai}
        {satuan && (
          <span className={`text-[13px] font-semibold text-tinta-3 ${satuan === "%" ? "ml-0.5" : "ml-1"}`}>
            {satuan}
          </span>
        )}
      </p>
    </div>
  );
}

/** Lencana status naskah. */
export function LencanaStatus({ status }: { status: string }) {
  const gaya: Record<string, string> = {
    published: "bg-baca-ya text-[#1f6b48]",
    scheduled: "bg-senja/15 text-jingga",
    draft: "bg-krem-3 text-tinta-2",
  };
  const teks: Record<string, string> = {
    published: "Terbit",
    scheduled: "Terjadwal",
    draft: "Draft",
  };
  return (
    <span
      data-status-naskah={status}
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] ${
        gaya[status] ?? "bg-krem-2 text-tinta-2"
      }`}
    >
      {teks[status] ?? status}
    </span>
  );
}
