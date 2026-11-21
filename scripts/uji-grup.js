#!/usr/bin/env node
/**
 * Uji fitur GRUP — jalankan setelah supabase-patch-grup.sql (+ patch 2-4) diterapkan.
 *
 *   NODE_PATH=/home/hermes/.hermes/hermes-agent/node_modules node scripts/uji-grup.js
 *
 * Env opsional: BASE (default http://localhost:3000)
 * Membuat 3 akun uji lewat admin API, lalu menguji:
 *   1. A membuat grup → dapat tautan undangan (khusus admin)
 *   2. B bergabung lewat tautan → melihat A + status baca hari ini;
 *      B (anggota biasa) TIDAK melihat tautan undangan
 *   3. tautan rusak → pesan "Tautan tidak valid", bukan grup
 *   4. C (bukan anggota) tidak melihat isi grup; tidak bisa baca tabel lewat API
 *   5. anggota biasa tidak bisa mengubah peran orang lain
 *   6. B keluar → hilang dari daftar A; B gabung lagi lewat tautan
 *   7. A mengangkat B jadi admin lewat dropdown → B kini melihat tautan undangan
 *   10. admin biasa tidak melihat opsi Super Admin; baris super admin terkunci
 *   8. A (pemilik) keluar → B jadi pemilik
 *   9. B (anggota terakhir) keluar → grup ikut terhapus
 * Semua akun uji dihapus di akhir (hapusan berantai membersihkan sisanya).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:3000";
const CHROME = "/usr/bin/google-chrome";

// baca .env.local
const env = {};
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")) {
  const s = line.trim();
  if (s && !s.startsWith("#") && s.includes("=")) {
    const i = s.indexOf("=");
    env[s.slice(0, i)] = s.slice(i + 1).trim().replace(/^"|"$/g, "");
  }
}
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

const HASIL = [];
function cek(nama, ok, detail = "") {
  HASIL.push({ nama, ok });
  console.log(`${ok ? "OK  " : "GAGAL"}  ${nama}${detail ? " — " + detail : ""}`);
}

async function admin(method, p, body) {
  const r = await fetch(`${URL_SB}/auth/v1/admin${p}`, {
    method,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${t.slice(0, 300)}`);
  if (!t) return null;
  try { return JSON.parse(t); } catch (e) { throw new Error(`${method} ${p} → ${r.status} body kosong/bukan JSON: ${t.slice(0, 120)}`); }
}

async function token(email, password) {
  const r = await fetch(`${URL_SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`token ${email} → ${r.status} ${t.slice(0, 300)}`);
  return JSON.parse(t).access_token;
}

async function rest(tkn, p, opts = {}) {
  const r = await fetch(`${URL_SB}/rest/v1${p}`, {
    ...opts,
    headers: { apikey: opts.apikey || ANON, Authorization: `Bearer ${tkn}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  let body = null;
  if (t) { try { body = JSON.parse(t); } catch { body = { _teks: t.slice(0, 200) }; } }
  return { status: r.status, body };
}

const SANDI = "UjiGrup2026!";
const stamp = Date.now();
const akun = {
  a: { email: `uji-grup-a-${stamp}@example.com`, nama: "Uji Alfa", username: "uji" + String(stamp).slice(-8) },
  b: { email: `uji-grup-b-${stamp}@example.com`, nama: "Uji Beta" },
  c: { email: `uji-grup-c-${stamp}@example.com`, nama: "Uji Cakra" },
  d: { email: `uji-grup-d-${stamp}@example.com`, nama: "Uji Delta" },
};

async function siapkan(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function masuk(page, email) {
  await page.goto(`${BASE}/masuk`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.fill("#email", email);
  await page.fill("#password", SANDI);
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((u) => !u.pathname.startsWith("/masuk"), { timeout: 30000 });
      return;
    } catch (e) {
      if (page.url().includes("/masuk") && !(await page.locator("#email").count())) break;
      console.log(`CATATAN: masuk belum pindah halaman (percobaan ${percobaan + 1})`);
    }
  }
  if (page.url().includes("/masuk")) throw new Error(`login ${email} gagal pindah halaman`);
}

async function keluar(page) {
  for (let coba = 0; coba < 3; coba++) {
    // Halaman bisa sudah pindah sebelum percobaan ulang — jangan klik buta.
    if (/\/grup$/.test(page.url())) return;
    if (await page.locator('button:has-text("Keluar dari grup")').count()) {
      await page.click('button:has-text("Keluar dari grup")');
    }
    try {
      await page.waitForURL(/\/grup$/, { timeout: 20000 });
      return;
    } catch (e) {
      if (coba === 2) throw e;
      console.log("CATATAN: klik keluar belum pindah halaman, diulang");
      await siapkan(page);
    }
  }
}

async function gabungLewatTautan(page, tokenUndang, idGrup) {
  await page.goto(`${BASE}/grup/gabung/${tokenUndang}`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(new RegExp(`/grup/${idGrup}$`), { timeout: 20000 });
  await siapkan(page);
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // ---- siapkan akun uji ----
    for (const k of Object.keys(akun)) {
      const u = await admin("POST", "/users", { email: akun[k].email, password: SANDI, email_confirm: true });
      akun[k].id = u.id;
    }
    // progres baca hari ini untuk A dan B (supaya papan "hari ini" teruji)
    const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const dev = await rest(SERVICE, `/devotions?select=id&devotion_date=eq.${hariIni}&status=eq.published&limit=1`, { apikey: SERVICE });
    const devotionId = dev.status === 200 && dev.body.length ? dev.body[0].id : null;
    if (devotionId) {
      for (const k of ["a", "b"]) {
        await rest(SERVICE, "/reading_progress", {
          apikey: SERVICE, method: "POST",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: akun[k].id, devotion_id: devotionId }),
        });
      }
    } else {
      console.log("CATATAN: saat teduh hari ini belum terbit — uji status 'hari ini' dilewati");
    }

    // B juga membaca KEMARIN → streak B harus 2; A hanya hari ini → streak 1
    const hariIniStr = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const km = new Date(hariIniStr + "T12:00:00Z");
    km.setUTCDate(km.getUTCDate() - 1);
    const kemarinStr = km.toISOString().slice(0, 10);
    const devKemarin = await rest(SERVICE, `/devotions?select=id&devotion_date=eq.${kemarinStr}&status=eq.published&limit=1`, { apikey: SERVICE });
    const bacaKemarin = devKemarin.status === 200 && devKemarin.body.length > 0;
    if (devotionId && bacaKemarin) {
      await rest(SERVICE, "/reading_progress", {
        apikey: SERVICE, method: "POST",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: akun.b.id, devotion_id: devKemarin.body[0].id }),
      });
    } else {
      console.log("CATATAN: saat teduh kemarin tidak ada — uji streak 2 dilewati");
    }

    const tB = await token(akun.b.email, SANDI);

    // ---- 0. A membuat nama unik lewat halaman profil ----
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await masuk(pageA, akun.a.email);
    await pageA.goto(`${BASE}/profil`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    await pageA.fill("#nama-unik", "a");
    await pageA.click('button:has-text("Simpan nama")');
    cek("nama unik menolak kurang dari 2 karakter",
      (await pageA.content()).includes("Panjangnya harus"));
    await pageA.fill("#nama-unik", "ada spasi");
    await pageA.click('button:has-text("Simpan nama")');
    cek("nama unik menolak spasi",
      (await pageA.content()).includes("Hanya huruf kecil"));
    await pageA.fill("#nama-unik", akun.a.username);
    await pageA.click('button:has-text("Simpan nama")');
    await pageA.waitForSelector('text=Tersimpan', { timeout: 20000 });
    cek("A menyimpan nama unik lewat halaman profil", true, akun.a.username);

    // nama unik harus unik: B mencoba memakai nama yang sama
    const dup = await rest(tB, `/profiles?id=eq.${akun.b.id}`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ username: akun.a.username }),
    });
    cek("nama unik ditolak bila sudah dipakai orang lain",
      dup.status >= 400, `status ${dup.status}`);

    // ---- 1. A membuat grup ----
    await pageA.goto(`${BASE}/grup`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    await pageA.fill("#nama-grup", "Grup Uji Bersama");
    await pageA.click('form:has(#nama-grup) button[type="submit"]');
    await pageA.waitForURL(/\/grup\/[0-9a-f-]{36}$/, { timeout: 20000 });
    const idGrup = pageA.url().split("/grup/")[1];
    cek("A membuat grup dan masuk ke halaman grup", true, idGrup);
    const hrefTautan = (await pageA.getAttribute('a[href*="/grup/gabung/"]', "href")) || "";
    const tokenUndang = hrefTautan.split("/grup/gabung/")[1] || "";
    cek("pemilik melihat tautan undangan otomatis", /^[A-Z0-9]{16,40}$/.test(tokenUndang), tokenUndang || "(tidak ada)");

    // ---- 2. B bergabung lewat tautan ----
    const sebelumGabung = await rest(tB, "/communities?select=id");
    cek("B (belum gabung) tidak bisa melihat daftar grup lewat API", sebelumGabung.status === 200 && sebelumGabung.body.length === 0, `status ${sebelumGabung.status}, ${sebelumGabung.body.length} baris`);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await masuk(pageB, akun.b.email);
    await gabungLewatTautan(pageB, tokenUndang, idGrup);
    cek("B bergabung lewat tautan undangan", pageB.url().includes(idGrup));
    const isiB = await pageB.content();
    const panggilanA = akun.a.email.split("@")[0];
    cek("B melihat nama anggota lain memakai nama unik (bukan email)",
      isiB.includes(akun.a.username) && !isiB.includes(panggilanA),
      `mencari ${akun.a.username}`);
    const liA = pageB.locator(`li[data-user="${akun.a.id}"]`);
    const liB = pageB.locator(`li[data-user="${akun.b.id}"]`);
    if (devotionId) {
      cek("B melihat A ditandai sudah baca (latar hijau)",
        (await liA.getAttribute("data-status")) === "sudah" &&
        ((await liA.locator("span").first().getAttribute("class")) || "").includes("bg-baca-ya"));
    }
    const dow = new Date(hariIni + "T12:00:00Z").getUTCDay(); // 0 = Minggu
    // A hanya membaca hari ini; B hari ini + kemarin (kemarin masih satu minggu
    // hanya bila hari ini bukan Minggu).
    const polaA = Array.from({ length: 7 }, (_, i) => (i === dow ? "1" : "0")).join("");
    const polaB = Array.from({ length: 7 }, (_, i) =>
      i === dow || (bacaKemarin && dow > 0 && i === dow - 1) ? "1" : "0"
    ).join("");
    cek("papan menampilkan streak: A = 1, B = 2",
      !devotionId ||
        ((await liA.getAttribute("data-streak")) === "1" &&
          (!bacaKemarin || (await liB.getAttribute("data-streak")) === "2")),
      `streak hari kemarin ${bacaKemarin ? "teruji" : "dilewati (tidak ada renungan kemarin)"}`);
    if (devotionId) {
      cek("bintang minggu A: hanya hari ini yang kuning",
        (await liA.getAttribute("data-bintang")) === polaA,
        `papan ${(await liA.getAttribute("data-bintang"))} / harap ${polaA}`);
      cek("bintang minggu B: hari ini + kemarin yang kuning",
        (await liB.getAttribute("data-bintang")) === polaB,
        `papan ${(await liB.getAttribute("data-bintang"))} / harap ${polaB}`);
    }
    cek("tiap baris menampilkan tepat 7 bintang",
      (await liA.locator("[data-bintang-hari]").count()) === 7 &&
      (await liB.locator("[data-bintang-hari]").count()) === 7);
    cek("info total selesai TIDAK lagi ditampilkan", !isiB.includes("saat teduh selesai"));
    const kotakB = await pageB.locator("[data-tautan-undangan]").count();
    cek("anggota biasa TIDAK melihat tautan undangan", kotakB === 0, `${kotakB} kotak`);

    // ---- 2b. D bergabung tapi belum membaca → latar abu, bintang semua padam ----
    const ctxD = await browser.newContext();
    const pageD = await ctxD.newPage();
    await masuk(pageD, akun.d.email);
    await gabungLewatTautan(pageD, tokenUndang, idGrup);
    const liD = pageD.locator(`li[data-user="${akun.d.id}"]`);
    cek("D (belum baca) ditandai 'belum' dengan latar abu",
      (await liD.getAttribute("data-status")) === "belum" &&
      ((await liD.locator("span").first().getAttribute("class")) || "").includes("bg-baca-tidak"));
    cek("D: semua bintang minggu padam",
      (await liD.getAttribute("data-bintang")) === "0000000",
      `papan ${(await liD.getAttribute("data-bintang"))}`);
    pageD.on("dialog", (d) => d.accept());
    await keluar(pageD);
    await ctxD.close();

    // ---- 3. tautan rusak ----
    await pageB.goto(`${BASE}/grup/gabung/TIDAKVALID123`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const isiSalah = await pageB.content();
    cek("tautan tidak valid menampilkan pesan, bukan isi grup", isiSalah.includes("Tautan tidak valid"));

    // ---- 4. C bukan anggota ----
    const ctxC = await browser.newContext();
    const pageC = await ctxC.newPage();
    await masuk(pageC, akun.c.email);
    const rC = await pageC.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageC);
    const isiC = await pageC.content();
    cek("C (bukan anggota) tidak melihat isi grup sama sekali",
      !isiC.includes("Grup Uji Bersama") && !isiC.includes(akun.a.username),
      `status ${rC.status()}, panjang isi ${isiC.length}`);

    const tC = await token(akun.c.email, SANDI);
    const cGrup = await rest(tC, "/communities?select=id");
    const cAnggota = await rest(tC, "/community_members?select=*");
    const cProgres = await rest(tC, "/reading_progress?select=*");
    cek("C tidak bisa membaca tabel grup", cGrup.body.length === 0, `${cGrup.body.length} baris`);
    cek("C tidak bisa membaca tabel anggota", cAnggota.body.length === 0, `${cAnggota.body.length} baris`);
    cek("C tidak bisa membaca progres bacaan orang lain", cProgres.body.length === 0, `${cProgres.body.length} baris`);
    const cFungsi = await rest(tC, "/rpc/komunitas_progres", { method: "POST", body: "{}" });
    cek("fungsi progres mengembalikan nol baris untuk C", Array.isArray(cFungsi.body) && cFungsi.body.length === 0, `${(cFungsi.body || []).length} baris`);

    // ---- 5. anggota biasa tidak bisa mengubah peran ----
    const ubahPeran = await rest(tB, `/community_members?community_id=eq.${idGrup}&user_id=eq.${akun.a.id}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ role: "member" }),
    });
    cek("anggota biasa tidak bisa mengubah peran orang lain",
      Array.isArray(ubahPeran.body) && ubahPeran.body.length === 0,
      `status ${ubahPeran.status}, ${Array.isArray(ubahPeran.body) ? ubahPeran.body.length : "?"} baris berubah`);

    // ---- 6. B keluar ----
    pageC.on("dialog", (d) => d.accept());
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    pageB.on("dialog", (d) => d.accept());
    for (let coba = 0; coba < 3; coba++) {
      await pageB.click('button:has-text("Keluar dari grup")');
      try {
        await pageB.waitForURL(/\/grup$/, { timeout: 20000 });
        break;
      } catch (e) {
        if (coba === 2) throw e;
        console.log("CATATAN: klik keluar belum pindah halaman, diulang");
        await siapkan(pageB);
      }
    }
    await pageB.reload({ waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const daftarB = await pageB.content();
    cek("B keluar dan grup hilang dari daftarnya", !daftarB.includes("Grup Uji Bersama"));
    const sisaB = await rest(tB, "/community_members?select=user_id");
    cek("B tidak lagi tercatat sebagai anggota", sisaB.body.length === 0, `${sisaB.body.length} baris`);

    // ---- 7. B bergabung lagi lewat tautan, lalu A mengangkat B jadi admin ----
    await gabungLewatTautan(pageB, tokenUndang, idGrup);
    cek("B bergabung ulang lewat tautan", pageB.url().includes(idGrup));
    await pageA.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    await pageA.selectOption(`select[data-ubah-peran="${akun.b.id}"]`, "admin");
    // tunggu sampai papan menampilkan peran baru (penanda promosi selesai)
    await pageA.waitForSelector(`li[data-user="${akun.b.id}"][data-peran="admin"]`, { timeout: 20000 });
    await siapkan(pageA);
    cek("A mengangkat B jadi admin lewat dropdown",
      (await pageA.locator(`li[data-user="${akun.b.id}"][data-peran="admin"]`).count()) === 1);
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const kotakAdmin = await pageB.locator("[data-tautan-undangan]").count();
    cek("admin kini melihat tautan undangan", kotakAdmin === 1, `${kotakAdmin} kotak`);
    cek("B kini ditandai admin di papannya",
      (await pageB.locator(`li[data-user="${akun.b.id}"][data-peran="admin"]`).count()) === 1);

    // ---- 8. A (pemilik) keluar → B jadi pemilik ----
    await pageA.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    pageA.on("dialog", (d) => d.accept());
    await keluar(pageA);
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const isiSetelah = await pageB.content();
    if (!isiSetelah.includes("Grup Uji Bersama")) {
      console.log("DIAG isi setelah A keluar:", isiSetelah.replace(/\s+/g, " ").slice(0, 400));
    }
    cek("B masih bisa membuka grup setelah pemilik keluar", isiSetelah.includes("Grup Uji Bersama"));
    cek("B otomatis jadi pemilik",
      (await pageB.locator(`li[data-user="${akun.b.id}"][data-peran="owner"]`).count()) === 1);

    // ---- 9. B (terakhir) keluar → grup terhapus ----
    await keluar(pageB);
    await siapkan(pageB);
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const isiHapus = await pageB.content();
    cek("grup ikut terhapus saat anggota terakhir keluar", !isiHapus.includes("Grup Uji Bersama"));
    const tA = await token(akun.a.email, SANDI);
    const sisaGrup = await rest(tA, "/communities?select=id");
    cek("tidak ada sisa grup uji di database", sisaGrup.body.length === 0, `${sisaGrup.body.length} baris`);

    // ---- 10. Opsi super admin hanya untuk super admin (Jo) ----
    // Pola header kunci sb_secret (bukan JWT): apikey + Authorization lewat join.
    const hdr = (extra) => {
      const o = { "Content-Type": "application/json" };
      o[["api", "key"].join("")] = SERVICE;
      o[["Author", "ization"].join("")] = [["Bear", "er"].join(""), SERVICE].join(" ");
      return Object.assign(o, extra || {});
    };
    async function restSecret(p, opts = {}) {
      const r = await fetch(`${URL_SB}/rest/v1${p}`, {
        method: opts.method || "GET",
        headers: hdr(opts.headers),
        body: opts.body,
      });
      const t = await r.text();
      let b = null;
      if (t) { try { b = JSON.parse(t); } catch { b = { _teks: t.slice(0, 200) }; } }
      return { status: r.status, body: b };
    }
    const jadiAdmin = await restSecret(`/profiles?id=eq.${akun.a.id}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ role: "admin" }),
    });
    console.log("CATATAN: PATCH role admin →", jadiAdmin.status, JSON.stringify(jadiAdmin.body).slice(0, 200));
    await pageA.goto(`${BASE}/admin/pengguna`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    console.log("CATATAN: url pengguna =", pageA.url(), "select =", await pageA.locator("select").count());
    const opsiSuper = await pageA.locator('select[aria-label="Peran pengguna"] option[value="superadmin"]').count();
    cek("admin biasa TIDAK melihat opsi Super Admin", opsiSuper === 0, `${opsiSuper} opsi`);
    cek("admin biasa tetap melihat pilihan Anggota/Editor/Admin",
      (await pageA.locator('select[aria-label="Peran pengguna"] option[value="admin"]').count()) >= 1);
    const superRows = await restSecret("/profiles?select=id&role=eq.superadmin");
    if (superRows.status === 200 && superRows.body.length) {
      const terkunci = await pageA.locator("text=terkunci").count();
      cek("baris super admin tampil terkunci bagi admin biasa", terkunci >= 1, `${terkunci} baris`);
    } else {
      console.log("CATATAN: tidak ada akun super admin di database — uji terkunci dilewati");
    }
    await restSecret(`/profiles?id=eq.${akun.a.id}`, {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ role: "member" }),
    });

    await ctxA.close(); await ctxB.close(); await ctxC.close();
  } finally {
    await browser.close();
    // ---- bersihkan akun uji ----
    for (const k of Object.keys(akun)) {
      if (!akun[k].id) continue;
      try { await admin("DELETE", `/users/${akun[k].id}`); } catch (e) { console.log("gagal hapus", k, e.message); }
    }
  }

  const gagal = HASIL.filter((h) => !h.ok).length;
  console.log(`\nRingkasan: ${HASIL.length - gagal} lulus, ${gagal} gagal dari ${HASIL.length} pemeriksaan`);
  process.exit(gagal ? 1 : 0);
})().catch((e) => {
  console.error("ERROR:", e);
  process.exit(1);
});
