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

  // 1. dropdown bulan punya Januari 2024
  await page.goto(BASE + "/arsip", { waitUntil: "domcontentloaded" });
  const opsi = await page.locator('select[name=bulan] option').allInnerTexts();
  cek("opsi 'Januari 2024' ada di dropdown", opsi.includes("Januari 2024"), opsi.length + " opsi");
  cek("opsi Desember 2024 ada", opsi.includes("Desember 2024"));
  cek("opsi Januari 2025 ada", opsi.includes("Januari 2025"));

  const topik = await page.locator('section a[href*="bulan=2024-"]').count();
  cek("topik bulanan memuat chip 2024", topik === 12, topik + " chip 2024");

  const kartuSemua = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("tanpa filter: kartu = 1030", kartuSemua === 1030, "kartu=" + kartuSemua);
  const ada2401 = await page.locator('a[href*="2024-01-01"]').count();
  cek("tanpa filter memuat 2024-01-01", ada2401 > 0, "cocok=" + ada2401);

  const pertama = await page.locator("article.kartu").first().boundingBox();
  cek("kartu pertama setelah topik bulanan", !!pertama, pertama ? "y=" + Math.round(pertama.y) : "tidak ada");

  // 2. ?bulan=2024-01 = 31 kartu
  await page.goto(BASE + "/arsip?bulan=2024-01", { waitUntil: "domcontentloaded" });
  const k2401 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-01 menampilkan 31 kartu", k2401 === 31, "kartu=" + k2401);
  const h = await page.locator("h1").first().innerText();
  cek("judul halaman arsip utuh", /Semua saat teduh/.test(h), h);

  // 3. ?bulan=2024-12
  await page.goto(BASE + "/arsip?bulan=2024-12", { waitUntil: "domcontentloaded" });
  const k2412 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-12 menampilkan 31 kartu", k2412 === 31, "kartu=" + k2412);

  // 4. ?tema= pada bulan lama
  await page.goto(BASE + "/arsip?bulan=2024-06", { waitUntil: "domcontentloaded" });
  const k2406 = await page.locator('a[href^="/saat-teduh/"]').count();
  cek("?bulan=2024-06 menampilkan 30 kartu", k2406 === 30, "kartu=" + k2406);

  // 5. tidak meluber horizontal
  const luber = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  cek("tidak meluber horizontal 390px", luber <= 0, "selisih=" + luber);

  await browser.close();
})();
