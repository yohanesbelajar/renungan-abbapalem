import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import type { DevotionCard } from "@/lib/types";

export default function DevotionCardItem({
  d,
  unggulan = false,
}: {
  d: DevotionCard;
  unggulan?: boolean;
}) {
  return (
    <article className="kartu kartu-naik relative flex h-full flex-col p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="label-kecil text-tinta-3">
          {formatTanggalID(d.devotion_date)}
        </p>
        {d.theme && (
          <Link
            href={`/arsip?tema=${encodeURIComponent(d.theme)}`}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-lavender px-2.5 py-1 text-[11.5px] font-semibold tracking-[0.02em] text-ungu-2 transition hover:bg-ungu hover:text-white"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {d.theme}
          </Link>
        )}
      </div>

      <h3
        className={`judul-rapat-sm mt-3 text-plum ${
          unggulan ? "text-[22px] sm:text-[26px]" : "text-[18.5px]"
        }`}
      >
        {/* after:absolute inset-0: seluruh kartu membuka isi saat teduh */}
        <Link
          href={`/saat-teduh/${d.slug}`}
          className="line-clamp-3 after:absolute after:inset-0 after:content-[''] transition-colors hover:text-ungu"
        >
          {d.title}
        </Link>
      </h3>

      {/* Potongan isi (summary) tidak ditampilkan di kartu mana pun —
          permintaan Jo 12 Nov 2026: daftar hanya tanggal + tema + judul + hati. */}

      <div className="mt-auto flex items-center justify-end gap-3 pt-4">
        <p className="flex items-center gap-1 text-[12.5px] text-tinta-3">
          <span aria-hidden className="text-[13px] text-ungu/70">
            ♥
          </span>
          {d.hearts_count}
        </p>
      </div>
    </article>
  );
}
