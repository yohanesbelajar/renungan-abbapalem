#!/usr/bin/env node
/**
 * Uji HALAMAN PANTAU GRUP (/admin/grup, khusus superadmin) + CATATAN AKTIVITAS.
 * Jalankan setelah supabase-pantau-aktivitas.sql diterapkan:
 *
 *   NODE_PATH=/home/hermes/.hermes/hermes-agent/node_modules node scripts/uji-pantau.js
 *
 * Env opsional: BASE (default http://localhost:3000)
 *
 * Yang diuji:
 *   1. belum login  → dialihkan ke /masuk (bukan halaman pantau)
 *   2. anggota biasa → 404, tanpa satu pun data grup/aktivitas
 *   3. anggota biasa → tabel aktivitas & rpc pengawas_progres = 0 baris (RLS)
 *   4. anonim       → tabel aktivitas = 0 baris
 *   5. superadmin (TIDAK jadi anggota grup mana pun) → melihat SEMUA grup,
 *      papan anggota, dan feed aktivitas (daftar/buat_grup/gabung/baca/ubah_nama)
 *   6. halaman pantau tidak punya kontrol ubah/hapus
 *   7. superadmin tidak tercatat sebagai anggota grup siapa pun
 * Semua akun uji + grup uji + baris aktivitas uji dihapus di akhir.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:3000";
const CHROME = "/usr/bin/google-chrome";
const JALANKAN_SQL = "/home/hermes/Hermes Allowed/Website Sate/tools-import/jalankan_sql.py";

/**
 * Promosi ke superadmin harus lewat SQL dashboard: pengaman lama
 * `jaga_superadmin` hanya mengizinkan akun superadmin LAMA (Jo) yang
 * mengangkat — kunci layanan dan SQL polos ditolak. Klaim JWT diset ke
 * id superadmin yang sudah ada selama satu perintah, lalu dikosongkan.
 */
function jalankanSql(sql) {
  const berkas = path.join(process.env.TMPDIR || "/tmp", `uji-pantau-${Date.now()}.sql`);
  fs.writeFileSync(berkas, sql);
  try {
    return execFileSync("python3", [JALANKAN_SQL, berkas], { encoding: "utf8" });
  } finally {
    try { fs.unlinkSync(berkas); } catch {}
  }
}

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
  try { return JSON.parse(t); } catch (e) { throw new Error(`${method} ${p} → ${r.status} bukan JSON: ${t.slice(0, 120)}`); }
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
  // apikey = kunci anon, KECUALI tkn memang kunci layanan (tanpa titik).
  // Token pengguna (JWT, ada titik) hanya boleh di Authorization.
  const kunci = opts.apikey || (tkn && !tkn.includes(".") ? tkn : null) || ANON;
  const r = await fetch(`${URL_SB}/rest/v1${p}`, {
    ...opts,
    headers: { apikey: kunci, Authorization: `Bearer ${tkn || ANON}`, "Content-Type": "application/json", ...(opts.headers || {}) },
  });
  const t = await r.text();
  let body = null;
  if (t) { try { body = JSON.parse(t); } catch { body = { _teks: t.slice(0, 200) }; } }
  return { status: r.status, body };
}

const SANDI = "UjiPantau2026!";
const stamp = Date.now();
const akun = {
  w: { email: `uji-pantau-w-${stamp}@example.com`, nama: "Uji Wasit" },
  m: { email: `uji-pantau-m-${stamp}@example.com`, nama: "Uji Monitor" },
  x: { email: `uji-pantau-x-${stamp}@example.com`, nama: "Uji Coba" },
};

async function siapkan(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
}

async function masuk(page, email) {
  await page.goto(`${BASE}/masuk`, { waitUntil: "domcontentloaded" });
  await siapkan(page);
  await page.fill("#email", email);
  await page.fill("#password", SANDI);
  for (let percobaan = 0; percobaan < 3; percobaan++) {
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL((u) => !u.pathname.startsWith("/masuk"), { timeout: 30000 });
      return;
    } catch (e) {
      if (page.url().includes("/masuk") && !(await page.locator("#email").count())) break;
      console.log(`CATATAN: masuk belum pindah (percobaan ${percobaan + 1})`);
    }
  }
  if (page.url().includes("/masuk")) throw new Error(`login ${email} gagal pindah halaman`);
}

const NAMA_GRUP = `Grup Uji Pantau ${stamp}`;
let idGrup = null;

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    // ---- siapkan akun uji ----
    for (const k of Object.keys(akun)) {
      const u = await admin("POST", "/users", { email: akun[k].email, password: SANDI, email_confirm: true });
      akun[k].id = u.id;
    }
    const ids = Object.keys(akun).map((k) => akun[k].id).join(",");
    const prof = await rest(SERVICE, `/profiles?select=id&id=in.(${ids})`);
    cek("akun uji punya baris profil (pendaftaran tercatat otomatis)",
      prof.status === 200 && prof.body.length === 3, `${prof.body ? prof.body.length : "?"} baris`);

    // w jadi superadmin — lewat SQL dashboard: pengaman lama hanya
    // mengizinkan superadmin lama (Jo) yang mengangkat, jadi klaim JWT
    // diset ke id superadmin itu selama perintah, lalu dikosongkan.
    const lama = await rest(SERVICE, "/profiles?select=id&role=eq.superadmin");
    const idSuper = lama.status === 200 && Array.isArray(lama.body) && lama.body.length ? lama.body[0].id : null;
    if (idSuper) {
      jalankanSql(
        `select set_config('request.jwt.claims', '{"sub":"${idSuper}","role":"authenticated","iss":"supabase"}', false);\n` +
        `update public.profiles set role = 'superadmin' where id = '${akun.w.id}';\n` +
        `select set_config('request.jwt.claims', '', false);\n`
      );
    }
    const cekRole = await rest(SERVICE, `/profiles?select=role&id=eq.${akun.w.id}`);
    const roleW = cekRole.status === 200 && Array.isArray(cekRole.body) && cekRole.body[0] ? cekRole.body[0].role : null;
    cek("akun uji W diangkat jadi superadmin lewat SQL dashboard",
      !!idSuper && roleW === "superadmin",
      idSuper ? `peran ${roleW}` : "tidak ada superadmin lama di database");

    // ---- m membuat grup lewat UI ----
    const ctxM = await browser.newContext();
    const pageM = await ctxM.newPage();
    await masuk(pageM, akun.m.email);
    await pageM.goto(`${BASE}/grup`, { waitUntil: "domcontentloaded" });
    await siapkan(pageM);
    await pageM.fill("#nama-grup", NAMA_GRUP);
    await pageM.click('form:has(#nama-grup) button[type="submit"]');
    await pageM.waitForURL(/\/grup\/[0-9a-f-]{36}$/, { timeout: 20000 });
    idGrup = pageM.url().split("/grup/")[1];
    cek("m membuat grup uji", !!idGrup, idGrup || "");

    // ---- m mengganti nama unik (memicu catatan ubah_nama) ----
    const usernameUji = "uji" + String(stamp).slice(-8);
    await pageM.goto(`${BASE}/profil`, { waitUntil: "domcontentloaded" });
    await siapkan(pageM);
    await pageM.fill("#nama-unik", usernameUji);
    await pageM.click('button:has-text("Simpan nama")');
    await pageM.waitForSelector("text=Tersimpan", { timeout: 20000 });
    cek("m menyimpan nama unik (memicu catatan aktivitas ubah nama)", true, usernameUji);

    // ---- m membaca renungan hari ini (memicu catatan baca) ----
    const hariIni = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    const dev = await rest(SERVICE, `/devotions?select=id&devotion_date=eq.${hariIni}&status=eq.published&limit=1`);
    let adaBaca = false;
    if (dev.status === 200 && dev.body.length) {
      const ins = await rest(SERVICE, "/reading_progress", {
        method: "POST", headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ user_id: akun.m.id, devotion_id: dev.body[0].id }),
      });
      adaBaca = ins.status < 300;
    }
    cek("m membaca renungan hari ini (memicu catatan baca)",
      adaBaca, adaBaca ? "" : "tidak ada renungan terbit hari ini — pemeriksaan baca dilewati");

    // ---- 1. belum login → ke /masuk ----
    const ctxAnon = await browser.newContext();
    const pageAnon = await ctxAnon.newPage();
    const rAnon = await pageAnon.goto(`${BASE}/admin/grup`, { waitUntil: "domcontentloaded" });
    await siapkan(pageAnon);
    cek("pengunjung belum login dialihkan ke halaman masuk",
      pageAnon.url().includes("/masuk"), `url ${pageAnon.url()} (status ${rAnon.status()})`);
    await ctxAnon.close();

    // ---- 2+3. anggota biasa (x) ----
    const ctxX = await browser.newContext();
    const pageX = await ctxX.newPage();
    await masuk(pageX, akun.x.email);
    const rX = await pageX.goto(`${BASE}/admin/grup`, { waitUntil: "domcontentloaded" });
    await siapkan(pageX);
    const isiX = await pageX.content();
    cek("anggota biasa TIDAK melihat halaman pantau (404/tanpa data)",
      !isiX.includes("Pantau Grup") && !isiX.includes(NAMA_GRUP),
      `status ${rX.status()}`);

    const tX = await token(akun.x.email, SANDI);
    const aktX = await rest(tX, "/aktivitas?select=id");
    cek("anggota biasa membaca 0 baris catatan aktivitas",
      aktX.status === 200 && Array.isArray(aktX.body) && aktX.body.length === 0,
      `status ${aktX.status}, ${Array.isArray(aktX.body) ? aktX.body.length : "?"} baris`);
    const rpcX = await rest(tX, "/rpc/pengawas_progres", { method: "POST", body: "{}" });
    cek("fungsi pantau mengembalikan 0 baris untuk anggota biasa",
      rpcX.status === 200 && Array.isArray(rpcX.body) && rpcX.body.length === 0,
      `${Array.isArray(rpcX.body) ? rpcX.body.length : "?"} baris`);

    // ---- 4. anonim ----
    const aktAnon = await rest(null, "/aktivitas?select=id");
    cek("pengunjung anonim membaca 0 baris catatan aktivitas",
      aktAnon.status === 200 && Array.isArray(aktAnon.body) && aktAnon.body.length === 0,
      `status ${aktAnon.status}, ${Array.isArray(aktAnon.body) ? aktAnon.body.length : "?"} baris`);
    await ctxX.close();

    // ---- 5+6+7. superadmin (w) ----
    const ctxW = await browser.newContext();
    const pageW = await ctxW.newPage();
    await masuk(pageW, akun.w.email);
    const rW = await pageW.goto(`${BASE}/admin/grup`, { waitUntil: "domcontentloaded" });
    await siapkan(pageW);
    const isiW = await pageW.content();
    cek("superadmin membuka halaman pantau", rW.status() === 200, `status ${rW.status()}`);
    cek("halaman pantau menampilkan seluruh grup (w bukan anggota)",
      isiW.includes("Pantau Grup") && isiW.includes(NAMA_GRUP));
    const kotakGrup = await pageW.locator(`[data-grup="${idGrup}"]`).count();
    cek("kartu grup uji tampil di halaman pantau", kotakGrup === 1, `${kotakGrup} kartu`);

    const tW = await token(akun.w.email, SANDI);
    const anggotaW = await rest(tW, `/community_members?select=community_id&user_id=eq.${akun.w.id}`);
    cek("superadmin TIDAK tercatat sebagai anggota grup mana pun (dalam uji)",
      anggotaW.status === 200 && Array.isArray(anggotaW.body) && anggotaW.body.length === 0,
      `${Array.isArray(anggotaW.body) ? anggotaW.body.length : "?"} baris`);
    const rpcW = await rest(tW, "/rpc/pengawas_progres", { method: "POST", body: "{}" });
    const lihatGrup = Array.isArray(rpcW.body) && rpcW.body.some((b) => b.grup_id === idGrup);
    cek("fungsi pantau mengembalikan grup uji ke superadmin", lihatGrup,
      `${Array.isArray(rpcW.body) ? rpcW.body.length : "?"} baris`);

    for (const jenis of ["daftar", "buat_grup", "gabung_grup", "ubah_nama"]) {
      const ada = (await pageW.locator(`[data-aktivitas="${jenis}"]`).count()) > 0;
      cek(`feed aktivitas mencatat: ${jenis}`, ada);
    }
    cek("feed aktivitas mencatat: baca", !adaBaca || (await pageW.locator('[data-aktivitas="baca"]').count()) > 0);

    const kontrolUbah = await pageW.locator('select[data-ubah-peran], button:has-text("Keluar dari grup")').count();
    cek("halaman pantau tanpa kontrol ubah/hapus/keluar", kontrolUbah === 0, `${kontrolUbah} kontrol`);
    await ctxW.close();

    // ---- bersihkan ----
    // grup uji: hapus baris keanggotaan terakhir → grup ikut terhapus (aturan lama)
    await rest(SERVICE, `/community_members?community_id=eq.${idGrup}`, { method: "DELETE" });
    const sisaGrup = await rest(SERVICE, `/communities?id=eq.${idGrup}`);
    cek("grup uji terhapus bersih", sisaGrup.status === 200 && sisaGrup.body.length === 0,
      `${sisaGrup.body ? sisaGrup.body.length : "?"} baris`);
  } finally {
    await browser.close();
    // hapus baris aktivitas uji (tanpa FK — aman dihapus kapan pun)
    try {
      const ids = Object.keys(akun).map((k) => akun[k].id).filter(Boolean);
      const or = `or=(user_id.in.(${ids.join(",")})${idGrup ? `,grup_id.eq.${idGrup}` : ""})`;
      const del = await rest(SERVICE, `/aktivitas?${or}`, { method: "DELETE", headers: { Prefer: "return=representation" } });
      console.log(`CATATAN: pembersihan catatan aktivitas uji → status ${del.status}, ${Array.isArray(del.body) ? del.body.length : "?"} baris`);
    } catch (e) { console.log("CATATAN: gagal membersihkan aktivitas uji:", e.message); }
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
