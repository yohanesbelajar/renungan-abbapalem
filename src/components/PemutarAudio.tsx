"use client";

// Pemutar audio renungan. Daftar audio dibaca di server (lib/audio) dan
// dikirim sebagai prop; komponen ini hanya memutar MP3 dari Supabase Storage.

import { useCallback, useEffect, useRef, useState } from "react";

const KUNCI_POSISI = "audio-posisi";
const KUNCI_LAJU = "audio-laju";

function bacaPosisi(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(KUNCI_POSISI) || "{}");
  } catch {
    return {};
  }
}

function simpanPosisi(slug: string, detik: number) {
  try {
    const semua = bacaPosisi();
    if (detik > 3) semua[slug] = Math.round(detik);
    else delete semua[slug];
    localStorage.setItem(KUNCI_POSISI, JSON.stringify(semua));
  } catch {}
}

function jam(detik: number): string {
  if (!Number.isFinite(detik) || detik < 0) detik = 0;
  const m = Math.floor(detik / 60);
  const s = Math.floor(detik % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PemutarAudio({
  slug,
  judul,
  src,
  durasi,
}: {
  slug: string;
  judul: string;
  src: string;
  durasi: number;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [main, setMain] = useState(false);
  const [waktu, setWaktu] = useState(0);
  const [total, setTotal] = useState(durasi);
  const [laju, setLaju] = useState(1);
  const [galat, setGalat] = useState(false);
  const [sisaTidur, setSisaTidur] = useState(0);

  // Kecepatan tersimpan dibaca saat metadata audio siap (bukan di effect:
  // setState di dalam effect memicu render berantai).
  function terapkanLaju(a: HTMLAudioElement) {
    const l = Number(localStorage.getItem(KUNCI_LAJU) || "1");
    const pakai = l >= 0.75 && l <= 1.5 ? l : 1;
    a.playbackRate = pakai;
    setLaju(pakai);
  }

  function pulihkanPosisi(a: HTMLAudioElement) {
    const pos = bacaPosisi()[slug];
    if (pos && pos < (a.duration || Infinity) - 10) a.currentTime = pos;
    terapkanLaju(a);
  }

  // MediaSession: judul di layar kunci + kontrol headset/mobil.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: judul,
      artist: "Saat Teduh Abbalove Palem",
      album: "Renungan harian",
    });
    navigator.mediaSession.setActionHandler("play", () => audio.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => audio.current?.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => {
      if (audio.current) audio.current.currentTime -= 15;
    });
    navigator.mediaSession.setActionHandler("seekforward", () => {
      if (audio.current) audio.current.currentTime += 15;
    });
    return () => {
      if (!("mediaSession" in navigator)) return;
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("seekbackward", null);
      navigator.mediaSession.setActionHandler("seekforward", null);
    };
  }, [judul]);

  // Tidur-tertunda: hitung mundur, lalu jeda audio saat habis.
  useEffect(() => {
    if (sisaTidur <= 0) return;
    const t = setTimeout(() => {
      if (sisaTidur === 1) {
        audio.current?.pause();
        setSisaTidur(0);
      } else {
        setSisaTidur((s) => s - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [sisaTidur]);

  const alih = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => setGalat(true));
    } else {
      a.pause();
    }
  }, []);

  function ubahLaju(v: number) {
    setLaju(v);
    if (audio.current) audio.current.playbackRate = v;
    try {
      localStorage.setItem("audio-laju", String(v));
    } catch {}
  }

  function maju(d: number) {
    if (audio.current) audio.current.currentTime = Math.max(0, audio.current.currentTime + d);
  }

  if (galat && !total) return null;

  return (
    <div className="mt-6 rounded-xl border border-garis bg-kertas p-4 shadow-[0_1px_2px_rgba(31,27,24,0.04)]">
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => setMain(true)}
        onPause={() => {
          setMain(false);
          if (audio.current) simpanPosisi(slug, audio.current.currentTime);
        }}
        onTimeUpdate={(e) => setWaktu(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setTotal(e.currentTarget.duration || durasi);
          pulihkanPosisi(e.currentTarget);
        }}
        onEnded={() => {
          setMain(false);
          simpanPosisi(slug, 0);
        }}
        onError={() => setGalat(true)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={alih}
          aria-label={main ? "Jeda audio" : "Dengarkan renungan"}
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-gradient-to-br from-[#8a2c86] to-[#5b2a63] text-white shadow-[0_2px_6px_rgba(53,22,58,0.3)] transition hover:brightness-110"
        >
          {main ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="3.5" height="12" rx="1" />
              <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M4 2.4v11.2c0 .5.55.8.97.53l8.4-5.6a.64.64 0 0 0 0-1.06l-8.4-5.6A.64.64 0 0 0 4 2.4Z" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-semibold text-tinta">Dengarkan renungan</span>
            <span className="text-[12px] tabular-nums text-tinta-3">
              {galat ? "audio gagal dimuat" : `${jam(waktu)} / ${jam(total)}`}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(Math.round(total), 1)}
            step={1}
            value={waktu}
            aria-label="Posisi audio"
            onChange={(e) => {
              const v = Number(e.target.value);
              setWaktu(v);
              if (audio.current) audio.current.currentTime = v;
            }}
            className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-garis accent-[#8a2c86]"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12.5px]">
        <button type="button" onClick={() => maju(-15)} className="btn btn-sm btn-halus" aria-label="Mundur 15 detik">
          ↺15
        </button>
        <button type="button" onClick={() => maju(15)} className="btn btn-sm btn-halus" aria-label="Maju 15 detik">
          15↻
        </button>
        <span className="mx-1 h-4 w-px bg-garis" aria-hidden />
        {[0.75, 1, 1.25, 1.5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => ubahLaju(v)}
            aria-pressed={laju === v}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${
              laju === v ? "bg-lavender text-ungu-2" : "text-tinta-3 hover:text-ungu"
            }`}
          >
            {String(v).replace(".", ",")}×
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-garis" aria-hidden />
        <button
          type="button"
          onClick={() => {
            if (sisaTidur > 0) {
              setSisaTidur(0);
              return;
            }
            setSisaTidur(15 * 60);
          }}
          aria-pressed={sisaTidur > 0}
          className={`rounded-full px-2.5 py-1 font-semibold transition ${
            sisaTidur > 0 ? "bg-lavender text-ungu-2" : "text-tinta-3 hover:text-ungu"
          }`}
        >
          {sisaTidur > 0 ? `tidur ${jam(sisaTidur)}` : "timer tidur"}
        </button>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-tinta-3">
        Suara dibacakan mesin. Teks lengkap tetap di bawah — bisa dibaca sambil mendengar.
      </p>
    </div>
  );
}
