// Uji pilihan cakupan pencarian (judul saja vs semua tulisan) di /arsip
const { chromium } = require('/home/hermes/.hermes/hermes-agent/node_modules/playwright');

const BASE = process.env.BASE || 'http://localhost:3000';
const hasil = [];
function cek(nama, syarat, info = '') {
  hasil.push({ nama, lulus: !!syarat, info });
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();

  // 1. Halaman arsip tanpa filter: pilihan cakupan ada, bawaan "semua tulisan"
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  cek('radio "judul saja" ada', await page.locator('input[name=di][value=judul]').count() === 1);
  cek('radio "semua tulisan" ada', await page.locator('input[name=di][value=semua]').count() === 1);
  cek('bawaan = semua tulisan', await page.locator('input[name=di][value=semua]').isChecked());

  // 2. Ketik "doa", pilih "judul saja", tekan Cari → URL & hasil
  await page.fill('input[name=cari]', 'doa');
  await page.check('input[name=di][value=judul]');
  await page.click('form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u = new URL(page.url());
  cek('URL membawa cari=doa', u.searchParams.get('cari') === 'doa', page.url());
  cek('URL membawa di=judul', u.searchParams.get('di') === 'judul');
  const teks = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('hitungan menyebut "di judul"', /di judul/.test(teks), teks);
  const kartuJudul = await page.locator('a[href^="/saat-teduh/"]').count();
  cek('ada kartu hasil (judul saja)', kartuJudul > 0 && kartuJudul < 83, 'kartu=' + kartuJudul);
  // kartu pertama harus langsung terlihat tanpa menggulir
  const kotak = await page.locator('article.kartu').first().boundingBox();
  cek('kartu pertama terlihat di layar HP tanpa gulir', kotak && kotak.y + 40 < 780, kotak ? 'y=' + Math.round(kotak.y) : 'tidak ada');

  // 3. Tekan "Tampilkan" pada form filter → cari + di TIDAK hilang
  await page.selectOption('select[name=bulan]', '2026-10');
  await page.click('button:has-text("Tampilkan")');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u2 = new URL(page.url());
  cek('Tampilkan mempertahankan cari', u2.searchParams.get('cari') === 'doa', page.url());
  cek('Tampilkan mempertahankan di=judul', u2.searchParams.get('di') === 'judul');
  cek('Tampilkan mempertahankan bulan', u2.searchParams.get('bulan') === '2026-10');
  cek('pilihan "judul saja" tetap terpilih', await page.locator('input[name=di][value=judul]').isChecked());
  const teks2 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('bulan baru mempersempit hasil', parseInt(teks2) < kartuJudul, teks2);

  // 4. Ganti ke "semua tulisan" lalu Cari → kembali ke 83 (bulan dikosongkan dulu)
  await page.selectOption('select[name=bulan]', '');
  await page.check('input[name=di][value=semua]');
  await page.click('form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u3 = new URL(page.url());
  cek('bulan dikosongkan lewat filter', u3.searchParams.get('bulan') === '', page.url());
  const teks3 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('kembali ke semua tulisan = 83', /^83 /.test(teks3.trim()), teks3);
  cek('hitungan tanpa "di judul"', !/di judul/.test(teks3), teks3);
  // Kotak "Topik tiap bulan" sengaja disembunyikan selama ada kata cari.
  cek('kotak "Topik tiap bulan" sembunyi saat mencari', await page.locator('text=Topik tiap bulan').count() === 0);
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  cek('kotak "Topik tiap bulan" tampil saat tanpa pencarian', await page.locator('text=Topik tiap bulan').count() > 0);

  // 5. Lebar desktop: pilihan tidak meluber
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const luber = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  cek('tidak ada luberan horizontal di 1200px', !luber);

  await browser.close();
  const gagal = hasil.filter((h) => !h.lulus);
  for (const h of hasil) console.log((h.lulus ? 'OK   ' : 'GAGAL') + ' ' + h.nama + (h.info ? '  [' + h.info + ']' : ''));
  console.log(gagal.length === 0 ? '\nSEMUA LULUS (' + hasil.length + ')' : '\nGAGAL: ' + gagal.length);
  process.exit(gagal.length === 0 ? 0 : 1);
})();
