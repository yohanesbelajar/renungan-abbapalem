// Service worker Saat Teduh.
// Tujuan: (1) situs tetap terbuka tanpa sinyal — edisi yang pernah dibuka
// dibaca dari cache, (2) aset & teks Alkitab tidak diunduh berulang,
// (3) halaman yang sudah ada tetap tampil saat jaringan putus.
//
// Strategi:
//  - Navigasi halaman: jaringan dulu, cache cadangan; bila dua-duanya gagal,
//    tampilkan /offline (halaman HTML yang ikut di-precache).
//  - Gambar: jaringan dulu, disimpan ke cache gambar; bila jaringan gagal,
//    pakai simpanan (splash & ikon bilah tetap tampil tanpa sinyal).
//  - /alkitab/*.json: cache dulu (teks Alkitab tidak berubah).
//  - Aset /_next/static/*: cache dulu (namanya ber-hash).
//  - /api/*: tidak disentuh (data harus segar).
// Versi cache dinaikkan setiap kali build berubah — ganti angka VERSI.

const VERSI = "sate-v4";
const CACHE_INTI = `${VERSI}-inti`;
const CACHE_HALAMAN = `${VERSI}-halaman`;
const CACHE_ASET = `${VERSI}-aset`;
const CACHE_GAMBAR = `${VERSI}-gambar`;
const MAKS_HALAMAN = 40;
const MAKS_GAMBAR = 60;

// Dipreca saat pemasangan: beranda + dua gambar yang selalu tampil (splash & bilah atas),
// supaya tampil walau jaringan putus.
const INTI = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/logo-palem.png",
  "/logo-rumah-256.png",
  "/icon-192.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(CACHE_INTI);
      // Satu per satu: satu berkas gagal tidak membatalkan seluruh instalasi.
      await Promise.all(INTI.map((u) => c.add(u).catch(() => {})));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      const nama = await caches.keys();
      await Promise.all(nama.filter((n) => !n.startsWith(VERSI)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })()
  );
});

async function simpanHalaman(req, res) {
  const c = await caches.open(CACHE_HALAMAN);
  await c.put(req, res.clone());
  const kunci = await c.keys();
  if (kunci.length > MAKS_HALAMAN) {
    // Buang yang paling lama (urutan keys = urutan masukan).
    await Promise.all(kunci.slice(0, kunci.length - MAKS_HALAMAN).map((k) => c.delete(k)));
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Teks Alkitab & aset ber-hash: cache dulu.
  if (url.pathname.startsWith("/alkitab/") || url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      (async () => {
        const c = await caches.open(CACHE_ASET);
        const ada = await c.match(req);
        if (ada) return ada;
        const res = await fetch(req);
        if (res.ok) c.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  // Gambar: jaringan dulu (selalu yang terbaru), disimpan untuk mode luring.
  // Bila jaringan gagal, pakai simpanan — splash & ikon bilah tetap tampil.
  if (req.destination === "image") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok && res.type === "basic") {
            const c = await caches.open(CACHE_GAMBAR);
            await c.put(req, res.clone()).catch(() => {});
            const kunci = await c.keys();
            if (kunci.length > MAKS_GAMBAR) {
              await Promise.all(kunci.slice(0, kunci.length - MAKS_GAMBAR).map((k) => c.delete(k)));
            }
          }
          return res;
        } catch {
          const ada = await caches.match(req);
          return ada || Response.error();
        }
      })()
    );
    return;
  }

  // Navigasi halaman: jaringan dulu, lalu cache, lalu halaman offline.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          // Simpan SEBELUM respons dikembalikan. e.waitUntil yang dipanggil
          // setelah await ditolak (InvalidStateError), dan menyimpan tanpa
          // ditunggu membuat worker bisa mati sebelum cache ditulis.
          if (res.ok && res.type === "basic") {
            await simpanHalaman(req, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          const c = await caches.open(CACHE_HALAMAN);
          const ada = await c.match(req);
          if (ada) return ada;
          // Halaman yang dipreca (beranda & halaman luring) ikut dicoba —
          // tanpa ini beranda selalu diganti layar "Tidak ada sinyal".
          const inti = await caches.open(CACHE_INTI);
          const punya = await inti.match(req);
          if (punya) return punya;
          return (await inti.match("/offline")) || Response.error();
        }
      })()
    );
  }
});
