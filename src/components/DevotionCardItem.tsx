import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import type { DevotionCard } from "@/lib/types";

export default function DevotionCardItem({ d }: { d: DevotionCard }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4 transition hover:border-[#2B4F8F]/40">
      <p className="text-xs text-slate-500">{formatTanggalID(d.devotion_date)}</p>
      {d.theme && (
        <p className="mt-1">
          <Link
            href={`/arsip?tema=${encodeURIComponent(d.theme)}`}
            className="inline-block rounded-full bg-[#2B4F8F] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#22406f]"
          >
            {d.theme}
          </Link>
        </p>
      )}
      <h3 className="mt-1 text-lg font-semibold leading-snug">
        <Link href={`/saat-teduh/${d.slug}`} className="hover:text-[#2B4F8F]">
          {d.title}
        </Link>
      </h3>
      {d.verse_reference && (
        <p className="mt-1 text-xs font-medium text-[#2B4F8F]">
          Ayat: {d.verse_reference}
        </p>
      )}
      {d.summary && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{d.summary}</p>
      )}
      <p className="mt-2 text-xs text-slate-400">♥ {d.hearts_count}</p>
    </article>
  );
}
