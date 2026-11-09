import Link from "next/link";
import { formatTanggalID } from "@/lib/dates";
import type { DevotionCard } from "@/lib/types";

export default function DevotionCardItem({ d }: { d: DevotionCard }) {
  return (
    <article className="rounded-lg border border-slate-200 p-4 transition hover:border-[#2B4F8F]/40">
      <p className="text-xs text-slate-500">
        {formatTanggalID(d.devotion_date)}
        {d.theme ? ` · ${d.theme}` : ""}
      </p>
      <h3 className="mt-1 text-lg font-semibold leading-snug">
        <Link href={`/renungan/${d.slug}`} className="hover:text-[#2B4F8F]">
          {d.title}
        </Link>
      </h3>
      {d.summary && (
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{d.summary}</p>
      )}
      <p className="mt-2 text-xs text-slate-400">♥ {d.hearts_count}</p>
    </article>
  );
}
