// Uji hierarki arsip (rancangan Jo, 12 Nov 2026):
//   /arsip → pilih tahun → pilih bulan → daftar judul
// Pakai: BASE=http://localhost:3000 node scripts/uji-arsip-hierarki.js
const { chromium } = require('/home/hermes/.hermes/hermes-agent/node_modules/playwright');

const BASE = process.env.BASE || 'http://localhost:3000';
const hasil = [];
function cek(nama, syarat, info = '') {
  hasil.push({ nama, lulus: !!syarat, info });
}

const NAMA_BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
// Jumlah tanggal per bulan 2024 (kabisat) — sumber: DB Supabase 12 Nov 2026.
const JUMLAH_2024 = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

async function kartuBulanan(page) {
  return page.locator('article.kartu').evaluateAll((as) =>
    as.map((a) => ({
      // .label-kecil memakai text-transform: uppercase, jadi innerText huruf besar
      tgl: ((a.querySelector('p.label-kecil') || {}).innerText || '').toLowerCase(),
      judul: (a.querySelector('h3') || {}).innerText || '',
    }))
  );
}

// Tunggu splash pembuka benar-benar tidak menutupi halaman (±1,2 detik),
// kalau tidak, klik uji kena lapisan splash.
async function tungguSplash(page) {
  await page
    .waitForFunction(
      () => {
        const s = document.querySelector('.splash');
        return !s || getComputedStyle(s).visibility === 'hidden';
      },
      { timeout: 6000 }
    )
    .catch(() => {});
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 } });
  const page = await ctx.newPage();

  // ===== 1. /arsip = hanya pilihan tahun =====
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const kartuJudul = await page.locator('article.kartu').count();
  cek('U1 /arsip: 0 kartu judul', kartuJudul === 0, 'kartu=' + kartuJudul);
  const hrefTahun = await page
    .locator('a[href^="/arsip?tahun="]')
    .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  cek(
    'U1 /arsip: tepat 3 pilihan tahun (2026, 2025, 2024)',
    hrefTahun.length === 3 && ['2026', '2025', '2024'].every((y) => hrefTahun.includes(`/arsip?tahun=${y}`)),
    JSON.stringify(hrefTahun)
  );
  const blnDiTahun = await page.locator('a[href*="bulan="]').count();
  cek('U1 /arsip: tidak ada pilihan bulan', blnDiTahun === 0, 'jumlah=' + blnDiTahun);
  const kotakTahun = await page.locator('a[href^="/arsip?tahun="]').first().boundingBox();
  cek(
    'U1 /arsip: kartu tahun pertama terlihat tanpa menggulir (390x780)',
    kotakTahun && kotakTahun.y >= 0 && kotakTahun.y + kotakTahun.height <= 780,
    kotakTahun ? `y=${Math.round(kotakTahun.y)} tinggi=${Math.round(kotakTahun.height)}` : 'tidak ada'
  );
  const teksTahun = await page.locator('a[href^="/arsip?tahun="]').allInnerTexts();
  cek(
    'U1 /arsip: tiap kartu tahun menyebut jumlah saat teduh',
    teksTahun.length === 3 && teksTahun.every((t) => /\d+ saat teduh/.test(t)),
    teksTahun.join(' | ').replace(/\n/g, ' / ')
  );

  // ===== 2. /arsip?tahun=2024 = 12 pilihan bulan =====
  await page.goto(BASE + '/arsip?tahun=2024', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const tautanBulan = page.locator('a[href*="&bulan="]');
  const nBulan = await tautanBulan.count();
  cek('U2 ?tahun=2024: 12 pilihan bulan', nBulan === 12, 'jumlah=' + nBulan);
  cek('U2 ?tahun=2024: 0 kartu judul', (await page.locator('article.kartu').count()) === 0);
  const isiBulan = await tautanBulan.allInnerTexts();
  for (let i = 0; i < 12; i++) {
    const teks = isiBulan[i] || '';
    const n = JUMLAH_2024[i];
    cek(
      `U2 ${NAMA_BULAN[i]} menyebut jumlah ${n}`,
      teks.includes(NAMA_BULAN[i]) && new RegExp(`(^|\\D)${n}(\\D|$)`).test(teks),
      teks.replace(/\n/g, ' / ')
    );
  }
  const body2024 = await page.locator('body').innerText();
  cek('U2: halaman tahun menyebut total 366 saat teduh', /366 saat teduh/.test(body2024));

  // ===== 3. /arsip?bulan=2024-03 = 31 kartu urut 1..31 =====
  await page.goto(BASE + '/arsip?bulan=2024-03', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const isi03 = await kartuBulanan(page);
  cek('U3 ?bulan=2024-03: 31 kartu judul', isi03.length === 31, 'kartu=' + isi03.length);
  const hari03 = isi03.map((k) => parseInt(k.tgl, 10));
  cek(
    'U3 ?bulan=2024-03: urutan tanggal 1..31 (bukan hanya jumlah)',
    hari03.length === 31 && hari03.every((d, i) => d === i + 1),
    hari03.join(',')
  );
  const kembaliTahun = await page.locator('a[href="/arsip?tahun=2024"]').count();
  cek('U3: ada tautan kembali ke pilihan tahun', kembaliTahun === 1);

  // ===== 4. 2025-05 dan 2025-08 =====
  await page.goto(BASE + '/arsip?bulan=2025-05', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const isi05 = await kartuBulanan(page);
  cek('U4 ?bulan=2025-05: 31 kartu', isi05.length === 31, 'kartu=' + isi05.length);
  const m4 = isi05.find((k) => k.tgl.startsWith('4 mei'));
  cek(
    'U4: 4 Mei = VISI – MISI MENJADI MURID KRISTUS',
    !!m4 && /VISI\s*[–-]\s*MISI\s+MENJADI\s+MURID\s+KRISTUS/.test(m4.judul),
    m4 ? m4.judul : 'tanggal 4 Mei tidak ada'
  );
  cek(
    'U4 ?bulan=2025-05: urutan tanggal naik',
    isi05.map((k) => parseInt(k.tgl, 10)).every((d, i) => d === i + 1)
  );

  await page.goto(BASE + '/arsip?bulan=2025-08', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const isi08 = await kartuBulanan(page);
  cek('U4 ?bulan=2025-08: 31 kartu', isi08.length === 31, 'kartu=' + isi08.length);
  const tgl10 = isi08.find((k) => k.tgl.startsWith('10 agustus'));
  cek(
    'U4 ?bulan=2025-08: memuat 10 Agustus',
    !!tgl10,
    tgl10 ? tgl10.judul : 'tidak ada'
  );

  // ===== 5. Pencarian langsung =====
  await page.goto(BASE + '/arsip?cari=kesombongan', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const nKartuCari = await page.locator('article.kartu').count();
  cek('U5 ?cari=kesombongan: langsung menampilkan kartu hasil', nKartuCari > 0, 'kartu=' + nKartuCari);
  cek(
    'U5 ?cari: bukan halaman pilih tahun',
    (await page.locator('a[href^="/arsip?tahun="]').count()) === 0
  );
  const hitung1 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('U5: baris hitungan hasil pencarian', /saat teduh ditemukan/.test(hitung1), hitung1.replace(/\n/g, ' '));
  const centang = page.locator('input[name=di][value=judul]');
  cek(
    'U5: centang "judul saja" ada & bawaan tidak tercentang',
    (await centang.count()) === 1 && !(await centang.isChecked())
  );
  await centang.check();
  await page.click('button:has-text("Tampilkan")');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
  const u2 = new URL(page.url());
  cek('U5: Tampilkan tidak membuang kata cari', u2.searchParams.get('cari') === 'kesombongan', page.url());
  cek('U5: Tampilkan membawa di=judul', u2.searchParams.get('di') === 'judul', page.url());
  const nJudul = await page.locator('article.kartu').count();
  cek('U5: "judul saja" mempersempit hasil', nJudul > 0 && nJudul < nKartuCari, `semua=${nKartuCari} judul=${nJudul}`);
  const hitung2 = await page.locator('p', { hasText: 'saat teduh ditemukan' }).first().innerText();
  cek('U5: hitungan menyebut "di judul"', /di judul/.test(hitung2), hitung2.replace(/\n/g, ' '));

  // ketik langsung dari halaman pilih tahun
  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.fill('input[name=cari]', 'kesombongan');
  await page.click('form button[type=submit]');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(900);
  cek(
    'U5: Cari dari /arsip langsung ke hasil (melewati pilih tahun/bulan)',
    new URL(page.url()).searchParams.get('cari') === 'kesombongan' &&
      (await page.locator('article.kartu').count()) > 0,
    page.url()
  );

  // ===== 6. Tombol Back browser =====
  // Catatan: waitForURL dengan predicate fungsi tidak dipakai — URL-nya objek
  // URL, bukan string. Polling page.url() (string) yang terbukti andal di sini.
  const tungguUrl = async (pola, batas = 15000) => {
    const cocok = () => (typeof pola === 'function' ? pola(page.url()) : pola.test(page.url()));
    const t0 = Date.now();
    while (Date.now() - t0 < batas) {
      if (cocok()) return true;
      await page.waitForTimeout(200);
    }
    return cocok();
  };
  const klikTautan = async (selector, pola) => {
    await tungguSplash(page);
    const kotak = await page.locator(selector).boundingBox();
    if (!kotak) return false;
    await page.mouse.click(kotak.x + kotak.width / 2, kotak.y + kotak.height / 2);
    return tungguUrl(pola);
  };

  await page.goto(BASE + '/arsip', { waitUntil: 'domcontentloaded' });
  const okTahun = await klikTautan('a[href="/arsip?tahun=2024"]', /tahun=2024/);
  cek(
    'U6: klik tahun → /arsip?tahun=2024',
    okTahun && !/bulan=/.test(page.url()),
    page.url()
  );
  const nBulan2 = await page.locator('a[href*="&bulan="]').count();
  cek('U6: halaman tujuan = pilihan bulan (12)', nBulan2 === 12, 'jumlah=' + nBulan2);

  const okBulan = await klikTautan('a[href*="bulan=2024-03"]', /bulan=2024-03/);
  cek('U6: klik bulan → /arsip?…bulan=2024-03', okBulan, page.url());
  await page.waitForSelector('article.kartu', { timeout: 15000 }).catch(() => {});
  cek('U6: halaman tujuan = daftar judul (31)', (await page.locator('article.kartu').count()) === 31);

  await page.goBack();
  const okBack1 = await tungguUrl((u) => /tahun=2024/.test(u) && !/bulan=/.test(u));
  await page.waitForSelector('a[href*="&bulan="]', { timeout: 15000 }).catch(() => {});
  const back1 = { url: page.url(), bln: await page.locator('a[href*="&bulan="]').count(), kartu: await page.locator('article.kartu').count() };
  cek(
    'U6: Back dari daftar bulan → pilihan bulan',
    okBack1 && back1.bln === 12 && back1.kartu === 0,
    `${back1.url} bln=${back1.bln} kartu=${back1.kartu}`
  );

  await page.goBack();
  const okBack2 = await tungguUrl((u) => /\/arsip(\?|$)/.test(u) && !/tahun=/.test(u) && !/cari=/.test(u));
  await page.waitForSelector('a[href^="/arsip?tahun="]', { timeout: 15000 }).catch(() => {});
  const back2 = { url: page.url(), tahun: await page.locator('a[href^="/arsip?tahun="]').count(), kartu: await page.locator('article.kartu').count() };
  cek(
    'U6: Back dari pilihan bulan → pilihan tahun',
    okBack2 && back2.tahun === 3 && back2.kartu === 0,
    `${back2.url} tahun=${back2.tahun} kartu=${back2.kartu}`
  );

  await browser.close();

  for (const h of hasil) console.log((h.lulus ? 'OK   ' : 'GAGAL') + ' ' + h.nama + (h.info ? '  [' + h.info + ']' : ''));
  const gagal = hasil.filter((h) => !h.lulus);
  console.log(gagal.length === 0 ? `\nSEMUA LULUS (${hasil.length})` : `\nGAGAL: ${gagal.length}`);
  process.exit(gagal.length === 0 ? 0 : 1);
})();
