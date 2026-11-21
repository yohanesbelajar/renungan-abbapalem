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
 *   7. A mengangkat B jadi admin → B kini melihat tautan undangan
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
  a: { email: `uji-grup-a-${stamp}@example.com`, nama: "Uji Alfa" },
  b: { email: `uji-grup-b-${stamp}@example.com`, nama: "Uji Beta" },
  c: { email: `uji-grup-c-${stamp}@example.com`, nama: "Uji Cakra" },
};

async function siapkan(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function masuk(page, email) {
  await page.goto(`${BASE}/masuk`, { waitUntil: "domcontentloaded" });
  await page.fill("#email", email);
  await page.fill("#password", SANDI);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/masuk"), { timeout: 20000 }),
    page.click('button[type="submit"]'),
  ]);
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

    // ---- 1. A membuat grup ----
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await masuk(pageA, akun.a.email);
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
    const tB = await token(akun.b.email, SANDI);
    const sebelumGabung = await rest(tB, "/communities?select=id");
    cek("B (belum gabung) tidak bisa melihat daftar grup lewat API", sebelumGabung.status === 200 && sebelumGabung.body.length === 0, `status ${sebelumGabung.status}, ${sebelumGabung.body.length} baris`);

    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await masuk(pageB, akun.b.email);
    await gabungLewatTautan(pageB, tokenUndang, idGrup);
    cek("B bergabung lewat tautan undangan", pageB.url().includes(idGrup));
    const isiB = await pageB.content();
    const panggilanA = akun.a.email.split("@")[0];
    cek("B melihat nama anggota lain", isiB.includes(panggilanA), `mencari ${panggilanA}`);
    if (devotionId) cek("B melihat penanda 'sudah baca' milik A", isiB.includes("Sudah baca"));
    const kotakB = await pageB.locator("[data-tautan-undangan]").count();
    cek("anggota biasa TIDAK melihat tautan undangan", kotakB === 0, `${kotakB} kotak`);

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
      !isiC.includes("Grup Uji Bersama") && !isiC.includes(panggilanA),
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
    await pageB.click('button:has-text("Keluar dari grup")');
    await pageB.waitForURL(/\/grup$/, { timeout: 20000 });
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
    await pageA.click('button:has-text("Jadikan admin")');
    // tunggu sampai tombolnya berubah jadi "Jadikan anggota" (penanda promosi selesai)
    await pageA.waitForSelector('button:has-text("Jadikan anggota")', { timeout: 20000 });
    await siapkan(pageA);
    const isiA2 = await pageA.content();
    cek("A mengangkat B jadi admin", isiA2.includes("Admin"));
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const kotakAdmin = await pageB.locator("[data-tautan-undangan]").count();
    cek("admin kini melihat tautan undangan", kotakAdmin === 1, `${kotakAdmin} kotak`);
    cek("B melihat lencana Admin", (await pageB.content()).includes("Admin"));

    // ---- 8. A (pemilik) keluar → B jadi pemilik ----
    await pageA.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageA);
    pageA.on("dialog", (d) => d.accept());
    await pageA.click('button:has-text("Keluar dari grup")');
    await pageA.waitForURL(/\/grup$/, { timeout: 20000 });
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const isiSetelah = await pageB.content();
    if (!isiSetelah.includes("Grup Uji Bersama")) {
      console.log("DIAG isi setelah A keluar:", isiSetelah.replace(/\s+/g, " ").slice(0, 400));
    }
    cek("B masih bisa membuka grup setelah pemilik keluar", isiSetelah.includes("Grup Uji Bersama"));
    cek("B otomatis jadi pemilik", isiSetelah.includes("Pemilik"));

    // ---- 9. B (terakhir) keluar → grup terhapus ----
    await pageB.click('button:has-text("Keluar dari grup")');
    await pageB.waitForURL(/\/grup$/, { timeout: 20000 });
    await siapkan(pageB);
    await pageB.goto(`${BASE}/grup/${idGrup}`, { waitUntil: "domcontentloaded" });
    await siapkan(pageB);
    const isiHapus = await pageB.content();
    cek("grup ikut terhapus saat anggota terakhir keluar", !isiHapus.includes("Grup Uji Bersama"));
    const tA = await token(akun.a.email, SANDI);
    const sisaGrup = await rest(tA, "/communities?select=id");
    cek("tidak ada sisa grup uji di database", sisaGrup.body.length === 0, `${sisaGrup.body.length} baris`);

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
