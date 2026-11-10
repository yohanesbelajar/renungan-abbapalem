import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import { TombolRujukan } from "@/components/AyatTeks";
import type { DevotionCard } from "@/lib/types";

export default function DevotionCardItem({ d }: { d: DevotionCard }) {
  return (
    <article className="relative rounded-lg border border-slate-200 p-4 transition hover:border-[#9B3F76]/40">
      <p className="text-xs text-slate-500">{formatTanggalID(d.devotion_date)}</p>
      {d.theme && (
        <p className="mt-1">
          {/* z-10: tetap bisa diklik di atas lapisan kartu (filter tema) */}
          <Link
            href={`/arsip?tema=${encodeURIComponent(d.theme)}`}
            className="relative z-10 inline-block rounded-full bg-[#9B3F76] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#7E3160]"
          >
            {d.theme}
          </Link>
        </p>
      )}
      <h3 className="mt-1 text-lg font-semibold leading-snug">
        {/* after:absolute inset-0 membuat seluruh kartu bisa diklik dan langsung
            membuka isi saat teduh (bukan halaman arsip). */}
        <Link
          href={`/saat-teduh/${d.slug}`}
          className="after:absolute after:inset-0 after:content-[''] hover:text-[#9B3F76]"
        >
          {d.title}
        </Link>
      </h3>
      {d.verse_reference && (
        <p className="relative z-10 mt-1 w-fit text-xs font-medium text-[#9B3F76]">
          Ayat:{" "}
          <TombolRujukan
            rujukan={d.verse_reference}
            className="text-xs font-medium text-[#9B3F76] decoration-[#9B3F76]/50"
          />
        </p>
      )}
      {d.summary && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{d.summary}</p>
      )}
      <p className="mt-2 text-xs text-slate-400">♥ {d.hearts_count}</p>
    </article>
  );
}
