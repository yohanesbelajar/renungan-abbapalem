import ScrollLock from "@/components/ScrollLock";

/* Tampil otomatis selama halaman tujuan dimuat (Next.js Suspense fallback).
   Halaman di belakang dibekukan: lapisan abu-abu + logo + spinner + teks. */
export default function Loading() {
  return (
    <>
      <ScrollLock />
      <div className="saat-loading" role="status" aria-live="polite" aria-busy="true">
        <div className="saat-loading-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-palem.png" alt="Abbalove Palem" width={72} height={72} />
        </div>
        <div className="saat-loading-spinner" aria-hidden="true" />
        <p>Memuat halaman…</p>
      </div>
    </>
  );
}
