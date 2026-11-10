"use client";

// Teks ayat yang bisa diklik: setiap rujukan (mis. "Yesaya 6:1-8") menjadi
// tombol yang membuka pop-up berisi teks ayat, meniru aplikasi Alkitab
// (panel gelap, kepala ungu, ayat berpenomoran, sorotan merah muda).
// Teks Alkitab diambil dari berkas JSON statis /alkitab/<kode>.json (TB © LAI 1974).

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LAI_CREDIT } from "@/lib/constants";
import {
  RE_RUJUKAN,
  bacaRujukan,
  kumpulAyat,
  muatKitab,
  parseRujukan,
  tampilkanRujukan,
  type AyatTerpilih,
  type Rujukan,
} from "@/lib/ayat";

// ---- Gaya inline hasil parse PDF: **{#hex}teks** (tebal), ~~{#hex}teks~~ (miring) ----
// Setiap potongan teks biasa diteruskan ke pasangRujukan() supaya rujukan ayat
// di dalam maupun di luar tebal/miring tetap bisa diklik.

function pasangRujukan(teks: string, kunci: string): React.ReactNode[] {
  if (!/[A-Za-z]/.test(teks)) return [teks];
  const re = RE_RUJUKAN;
  re.lastIndex = 0;
  const keluar: React.ReactNode[] = [];
  let terakhir = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(teks)) !== null) {
    const r = bacaRujukan(m);
    if (!r) continue;
    if (m.index > terakhir) keluar.push(teks.slice(terakhir, m.index));
    keluar.push(
      <PemicuAyat key={`${kunci}v${m.index}`} rujukan={r}>
        {r.tampil}
      </PemicuAyat>,
    );
    terakhir = re.lastIndex;
  }
  if (keluar.length === 0) return [teks];
  if (terakhir < teks.length) keluar.push(teks.slice(terakhir));
  return keluar;
}

function italik(teks: string, kunci: string): React.ReactNode[] {
  const keluar: React.ReactNode[] = [];
  const re = /~~(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)~~/g;
  let terakhir = 0;
  let m;
  while ((m = re.exec(teks))) {
    if (m.index > terakhir)
      keluar.push(...pasangRujukan(teks.slice(terakhir, m.index), `${kunci}s${m.index}`));
    keluar.push(
      <em key={`${kunci}-i${m.index}`} style={m[1] ? { color: m[1] } : undefined}>
        {pasangRujukan(m[2], `${kunci}e${m.index}`)}
      </em>,
    );
    terakhir = re.lastIndex;
  }
  if (terakhir < teks.length)
    keluar.push(...pasangRujukan(teks.slice(terakhir), `${kunci}t`));
  return keluar;
}

function gayaTeks(teks: string, kunci = "b"): React.ReactNode[] {
  const keluar: React.ReactNode[] = [];
  const re = /\*\*(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)\*\*/g;
  let terakhir = 0;
  let m;
  while ((m = re.exec(teks))) {
    if (m.index > terakhir)
      keluar.push(...italik(teks.slice(terakhir, m.index), `${kunci}p${m.index}`));
    keluar.push(
      <strong key={`${kunci}b${m.index}`} style={m[1] ? { color: m[1] } : undefined}>
        {italik(m[2], `${kunci}i${m.index}`)}
      </strong>,
    );
    terakhir = re.lastIndex;
  }
  if (terakhir < teks.length) keluar.push(...italik(teks.slice(terakhir), `${kunci}t`));
  return keluar;
}

// ---- Ikon ----

function Ikon({ d, ...p }: { d: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      <path d={d} />
    </svg>
  );
}

// ---- Pop-up ayat ----

function PopupAyat({
  rujukan,
  cadangan,
  tutup,
}: {
  rujukan: Rujukan | null;
  cadangan?: { rujukan: string; teks: string };
  tutup: () => void;
}) {
  const [ayat, setAyat] = useState<AyatTerpilih[] | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [tersalin, setTersalin] = useState(false);
  const judul = rujukan ? tampilkanRujukan(rujukan) : (cadangan?.rujukan ?? "Ayat");
  const teksCadangan = !rujukan && cadangan?.teks ? cadangan.teks : null;
  const refPanel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let batal = false;
    if (!rujukan) return;
    muatKitab(rujukan.kode)
      .then((kitab) => {
        if (batal) return;
        const hasil = kumpulAyat(kitab, rujukan);
        if (hasil.length === 0) throw new Error("ayat tidak ditemukan");
        setAyat(hasil);
      })
      .catch((e: unknown) => {
        if (!batal) setGalat(e instanceof Error ? e.message : "gagal memuat");
      });
    return () => {
      batal = true;
    };
  }, [rujukan]);

  useEffect(() => {
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") tutup();
    };
    window.addEventListener("keydown", onKey);
    refPanel.current?.focus();
    return () => {
      document.body.style.overflow = sebelumnya;
      window.removeEventListener("keydown", onKey);
    };
  }, [tutup]);

  const salin = async () => {
    const isi = ayat
      ? ayat
          .map(
            (a, i) =>
              (i === 0 || ayat[i - 1].pasal !== a.pasal ? `${a.pasal}:` : "") +
              `${a.ayat} ${a.teks}`,
          )
          .join(" ")
      : (teksCadangan ?? "");
    if (!isi) return;
    const teks = `${judul}\n\n"${isi}"\n\n${LAI_CREDIT}`;
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 1600);
    } catch {
      setTersalin(false);
    }
  };

  const memuat = rujukan !== null && ayat === null && !galat;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) tutup();
      }}
    >
      <div
        ref={refPanel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={judul}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#2B2B2B] shadow-[0_20px_60px_rgba(0,0,0,0.45)] outline-none"
      >
        {/* Kepala ungu: judul kiri, salin + tutup kanan */}
        <div className="flex items-center justify-between gap-3 bg-[#963296] px-4 py-3">
          <span className="truncate text-base font-bold text-white">{judul}</span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={salin}
              aria-label="Salin ayat"
              className="rounded-full p-2 text-white/90 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              {tersalin ? (
                <Ikon d="M20 6 9 17l-5-5" className="h-5 w-5" />
              ) : (
                <Ikon
                  d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"
                  className="h-5 w-5"
                />
              )}
            </button>
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup"
              className="rounded-full p-2 text-white/90 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Ikon d="M18 6 6 18M6 6l12 12" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Isi ayat */}
        <div className="max-h-[65vh] overflow-y-auto px-5 py-4 text-[16px] leading-[1.75] text-white">
          {memuat && (
            <p className="flex items-center gap-3 py-6 text-white/70">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Memuat ayat…
            </p>
          )}
          {galat && !teksCadangan && (
            <p className="py-6 text-white/70">Ayat tidak dapat dimuat: {galat}</p>
          )}
          {teksCadangan && (
            <p>
              <span className="rounded bg-[#E91E63]/30 px-1 py-0.5">{teksCadangan}</span>
            </p>
          )}
          {ayat && (
            <p>
              {ayat.map((a, i) => {
                const awalPasal = i === 0 || ayat[i - 1].pasal !== a.pasal;
                const nomor = (awalPasal ? `${a.pasal}:` : "") + `${a.ayat}`;
                return (
                  <span key={`${a.pasal}:${a.ayat}`}>
                    {i > 0 && " "}
                    <span className={i === 0 ? "rounded bg-[#E91E63]/30 px-1 py-0.5" : undefined}>
                      <sup className="mr-0.5 text-[0.7em] text-white/70">{nomor}</sup>
                      {a.teks}
                    </span>
                  </span>
                );
              })}
            </p>
          )}
          <p className="mt-4 text-xs text-white/50">{LAI_CREDIT}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ---- Pemicu: rujukan yang bisa diklik ----

const GAYA_PEMICU =
  "m-0 cursor-pointer border-0 bg-transparent p-0 text-inherit underline decoration-dotted underline-offset-2 transition hover:decoration-solid";

function PemicuAyat({
  rujukan,
  children,
  className,
}: {
  rujukan: Rujukan;
  children: React.ReactNode;
  className?: string;
}) {
  const [buka, setBuka] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className={`${GAYA_PEMICU} ${className ?? "hover:text-[#9B3F76]"}`}
      >
        {children}
      </button>
      {buka && <PopupAyat rujukan={rujukan} tutup={() => setBuka(false)} />}
    </>
  );
}

/** Rujukan yang tampil sebagai tombol; bila teks kitab tak ada, pakai cadangan. */
export function TombolRujukan({
  rujukan,
  teksCadangan,
  className,
}: {
  rujukan: string;
  teksCadangan?: string;
  className?: string;
}) {
  const [buka, setBuka] = useState(false);
  const parsed = parseRujukan(rujukan);
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className={`${GAYA_PEMICU} ${className ?? "hover:text-[#9B3F76]"}`}
      >
        {rujukan}
      </button>
      {buka && (
        <PopupAyat
          rujukan={parsed}
          cadangan={parsed ? undefined : { rujukan, teks: teksCadangan ?? "" }}
          tutup={() => setBuka(false)}
        />
      )}
    </>
  );
}

/** Paragraf berisi teks bergaya inline + rujukan ayat yang bisa diklik. */
export function TeksAyat({
  teks,
  kunci,
  className,
}: {
  teks: string;
  kunci: string;
  className?: string;
}) {
  return <p className={className}>{gayaTeks(teks, kunci)}</p>;
}
