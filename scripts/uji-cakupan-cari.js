// Uji pilihan cakupan pencarian (judul saja vs semua tulisan) di /arsip.
// Bentuk akhir: kotak centang "judul saja" DI DALAM kotak teks pencarian.
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

  // 1. Halaman arsip tanpa filter: kotak centang ada di dalam kotak cari, belum dicentang
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const kotakCari = page.locator('input[name=cari]');
  const centang = page.locator('input[name=di][value=judul]');
  cek('kotak centang "judul saja" ada', await centang.count() === 1);
  cek('bawaan TIDAK dicentang (cari semua tulisan)', !(await centang.isChecked()));
  cek('radio "semua" lama sudah tidak ada', await page.locator('input[name=di][value=semua]').count() === 0);
  // posisi: di dalam kotak teks, sisi kanan
  const bk = await kotakCari.boundingBox();
  const bc = await centang.locator('..').boundingBox();
  cek(
    'centang berada DI DALAM kotak teks, sisi kanan',
    bk && bc && bc.x > bk.x && bc.x + bc.width <= bk.x + bk.width + 2 && bc.y > bk.y - 1 && bc.y + bc.height < bk.y + bk.height + 1,
    bk && bc ? `kotak=${Math.round(bk.x)}..${Math.round(bk.x + bk.width)} centang=${Math.round(bc.x)}..${Math.round(bc.x + bc.width)}` : 'bbox gagal'
  );
  // klik label (bukan kotak centangnya) harus ikut menyalakan centang
  await page.click('label:has(input[name=di])');
  cek('klik teks label ikut menyalakan centang', await centang.isChecked());
  await page.uncheck('input[name=di][value=judul]');

  // 2. Ketik "doa", centang, tekan Cari → URL & hasil
  await kotakCari.fill('doa');
  await centang.check();
  await page.click('form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u = new URL(page.url());
  cek('URL membawa cari=doa', u.searchParams.get('cari') === 'doa', page.url());
  cek('URL membawa di=judul', u.searchParams.get('di') === 'judul');
  cek('centang tetap tersalin setelah pindah halaman', await centang.isChecked());
  const teks = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('hitungan menyebut "di judul"', /di judul/.test(teks), teks);
  const kartuJudul = await page.locator('a[href^="/saat-teduh/"]').count();
  cek('ada kartu hasil (judul saja)', kartuJudul > 0 && kartuJudul < 366, 'kartu=' + kartuJudul);
  const kotak = await page.locator('article.kartu').first().boundingBox();
  cek('kartu pertama terlihat di layar HP tanpa gulir', kotak && kotak.y + 40 < 780, kotak ? 'y=' + Math.round(kotak.y) : 'tidak ada');

  // 3. Tekan "Tampilkan" → cari + di + bulan TIDAK hilang
  await page.selectOption('select[name=bulan]', '2026-10');
  await page.click('button:has-text("Tampilkan")');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u2 = new URL(page.url());
  cek('Tampilkan mempertahankan cari', u2.searchParams.get('cari') === 'doa', page.url());
  cek('Tampilkan mempertahankan di=judul', u2.searchParams.get('di') === 'judul');
  cek('Tampilkan mempertahankan bulan', u2.searchParams.get('bulan') === '2026-10');
  cek('centang tetap tercentang', await centang.isChecked());
  const teks2 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('bulan baru mempersempit hasil', parseInt(teks2) < kartuJudul, teks2);

  // 4. Lepas centang + kosongkan bulan → kembali ke semua tulisan = 83
  await page.uncheck('input[name=di][value=judul]');
  await page.selectOption('select[name=bulan]', '');
  await page.click('button:has-text("Tampilkan")');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1200);
  const u3 = new URL(page.url());
  cek('tanpa centang: URL tanpa di=judul', u3.searchParams.get('di') !== 'judul', page.url());
  cek('bulan dikosongkan lewat filter', !u3.searchParams.get('bulan'), page.url());
  const teks3 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('kembali ke semua tulisan (angka penuh)', /^366 /.test(teks3.trim()), teks3);
  cek('hitungan tanpa "di judul"', !/di judul/.test(teks3), teks3);

  // 5. Kotak "Topik tiap bulan": sembunyi saat mencari, tampil saat tanpa pencarian
  cek('kotak "Topik tiap bulan" sembunyi saat mencari', await page.locator('text=Topik tiap bulan').count() === 0);
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  cek('kotak "Topik tiap bulan" tampil saat tanpa pencarian', await page.locator('text=Topik tiap bulan').count() > 0);

  // 6. Lebar desktop: centang di kotak teks tidak meluber
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
