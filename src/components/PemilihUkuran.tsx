"use client";

// Pemilih ukuran huruf isi saat teduh — tiga tombol "A" (kecil / sedang / besar)
// tanpa tulisan apa pun, diletakkan di atas isi dan sedikit menjorok ke kanan.
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
    <div className="mt-7 flex justify-end pr-1 sm:pr-2">
      <div
        role="group"
        aria-label="Ukuran huruf isi saat teduh"
        className="inline-flex items-center gap-0.5 rounded-full p-0.5"
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
              className={`flex h-8 w-8 items-center justify-center rounded-full leading-none transition ${
                aktif
                  ? "bg-ungu font-semibold text-white shadow-[0_1px_3px_rgba(74,35,82,0.25)]"
                  : "font-medium text-tinta-2 hover:bg-krem-2 hover:text-ungu"
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
