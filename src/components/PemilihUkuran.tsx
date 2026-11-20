"use client";

// Pemilih ukuran huruf isi saat teduh — tiga tombol "A" (kecil / sedang / besar).
// Hanya mengubah ukuran wadah isi renungan, bukan seluruh halaman. Pilihan
// disimpan di localStorage; bawaan "sedang" = tampilan yang sudah ada.

export type Ukuran = "kecil" | "sedang" | "besar";

export const UKURAN_BAWAAN: Ukuran = "sedang";
export const KUNCI_UKURAN = "sate-ukuran-isi";

const PILIHAN: { nilai: Ukuran; label: string; huruf: number }[] = [
  { nilai: "kecil", label: "Kecil", huruf: 13 },
  { nilai: "sedang", label: "Sedang", huruf: 16 },
  { nilai: "besar", label: "Besar", huruf: 20 },
];

export function bacaUkuran(): Ukuran {
  try {
    const v = localStorage.getItem(KUNCI_UKURAN);
    if (v === "kecil" || v === "sedang" || v === "besar") return v;
  } catch {
    // localStorage diblokir — pakai bawaan
  }
  return UKURAN_BAWAAN;
}

export default function PemilihUkuran({
  ukuran,
  ubah,
}: {
  ukuran: Ukuran;
  ubah: (u: Ukuran) => void;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3 rounded-xl border border-garis bg-kertas px-3.5 py-3 shadow-[0_1px_2px_rgba(74,35,82,0.04)]">
      <div>
        <p className="label-kecil text-tinta-3">Pengaturan</p>
        <p className="mt-0.5 text-[13.5px] font-semibold text-tinta">Ukuran huruf</p>
      </div>
      <div
        role="group"
        aria-label="Ukuran huruf isi saat teduh"
        className="flex items-center gap-1.5 rounded-full bg-krem-2 p-1"
      >
        {PILIHAN.map((p) => {
          const aktif = ukuran === p.nilai;
          return (
            <button
              key={p.nilai}
              type="button"
              onClick={() => ubah(p.nilai)}
              aria-pressed={aktif}
              aria-label={`Ukuran huruf ${p.label.toLowerCase()}`}
              title={`Ukuran huruf ${p.label.toLowerCase()}`}
              className={`flex h-9 w-9 items-center justify-center rounded-full font-semibold leading-none transition ${
                aktif
                  ? "bg-ungu text-white shadow-[0_2px_6px_rgba(74,35,82,0.28)]"
                  : "text-tinta-2 hover:bg-white hover:text-ungu"
              }`}
            >
              <span style={{ fontSize: `${p.huruf}px` }}>A</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
