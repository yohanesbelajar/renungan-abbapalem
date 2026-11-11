// Uji regresi arsip 2024 + hierarki tahun/bulan (diperbarui 12 Nov 2026:
// /arsip = pilih tahun, ?tahun = pilih bulan, ?bulan = daftar judul).
const { chromium } = require("/home/hermes/.hermes/hermes-agent/node_modules/playwright");

const BASE = process.env.BASE || "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  const cek = (nama, ok, info) =>
    console.log(`${ok ? "OK   " : "GAGAL"} ${nama}${info ? "  [" + info + "]" : ""}`);

  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();

  // 1. /arsip = pilih tahun (menggantikan daftar 1.030 kartu)
  await page.goto(BASE + "/arsip", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const tahun = await page.locator('a[href^="/arsip?tahun="]').count();
  cek("/arsip memuat 3 pilihan tahun", tahun === 3, tahun + " kartu tahun");
  cek("/arsip tanpa kartu judul", (await page.locator("article.kartu").count()) === 0);
  const pertama = await page.locator('a[href^="/arsip?tahun="]').first().boundingBox();
  cek(
    "kartu tahun pertama terlihat tanpa gulir (390x780)",
    !!pertama && pertama.y + pertama.height <= 780,
    pertama ? "y=" + Math.round(pertama.y) : "tidak ada"
  );

  // 2. dropdown bulan/tema tetap ada pada halaman hasil pencarian
  await page.goto(BASE + "/arsip?cari=doa", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const opsi = await page.locator("select[name=bulan] option").allInnerTexts();
  cek("opsi 'Januari 2024' ada di dropdown", opsi.includes("Januari 2024"), opsi.length + " opsi");
  cek("opsi Desember 2024 ada", opsi.includes("Desember 2024"));
  cek("opsi Januari 2025 ada", opsi.includes("Januari 2025"));
  const temaOpsi = await page.locator("select[name=tema] option").allInnerTexts();
  cek("dropdown tema terisi", temaOpsi.length > 1, temaOpsi.length + " opsi");

  // 3. ?tahun=2024 = 12 pilihan bulan
  await page.goto(BASE + "/arsip?tahun=2024", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const bulan24 = await page.locator('a[href*="&bulan="]').count();
  cek("?tahun=2024 memuat 12 pilihan bulan", bulan24 === 12, bulan24 + " bulan");
  cek("?tahun=2024 tanpa kartu judul", (await page.locator("article.kartu").count()) === 0);
  const t2024 = await page.locator("body").innerText();
  cek("?tahun=2024 menyebut 366 saat teduh", /366 saat teduh/.test(t2024));

  // 4. ?bulan=2024-01 = 31 kartu, urut tanggal
  await page.goto(BASE + "/arsip?bulan=2024-01", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const k2401 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-01 menampilkan 31 kartu", k2401 === 31, "kartu=" + k2401);
  const h = await page.locator("h1").first().innerText();
  cek("kepala halaman bulan menampilkan Januari 2024", /Januari 2024/.test(h), h);

  // 5. ?bulan=2024-12
  await page.goto(BASE + "/arsip?bulan=2024-12", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const k2412 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-12 menampilkan 31 kartu", k2412 === 31, "kartu=" + k2412);

  // 6. ?bulan=2024-06 = 30 kartu
  await page.goto(BASE + "/arsip?bulan=2024-06", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800); // tunggu SSR + CSS siap sebelum mengukur
  const k2406 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-06 menampilkan 30 kartu", k2406 === 30, "kartu=" + k2406);

  // 7. tidak meluber horizontal
  const luber = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  cek("tidak meluber horizontal 390px", luber <= 0, "selisih=" + luber);

  await browser.close();
})();
