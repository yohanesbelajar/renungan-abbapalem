// Isi saat teduh kini disimpan sebagai HTML dari editor Tiptap,
// tetapi baris lama masih berupa teks polos (paragraf dipisah satu baris kosong).
// Semua pembaca wajib lewat di sini supaya keduanya tampil sama.

export type BarisIsi = {
  jenis:
    | "paragraf"
    | "h2"
    | "h3"
    | "label"
    | "daftar"
    | "tugas"
    | "kutipan"
    | "tabel"
    | "kode"
    | "pemisah";
  /** Potongan HTML utuh, termasuk tag pembukanya. */
  html: string;
};

const RE_TAG = /<\/?[a-z][^>]*>/i;

export function isiHtml(isi: string): boolean {
  return RE_TAG.test(isi);
}

/** Tag yang dianggap memulai satu blok isi. */
const TAG_BLOK = /^(p|h[1-6]|ul|ol|blockquote|pre|table|hr|div)$/i;
/** Tag tanpa pasangan penutup. */
const TAG_HAPUS = new Set([
  "br", "hr", "img", "input", "col", "source", "track",
  "area", "base", "link", "meta", "wbr",
]);

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Gaya inline lama hasil parser PDF: **{#hex}tebal** dan ~~{#hex}miring~~
function gayaLama(teks: string): string {
  return escapeHtml(teks)
    .replace(
      /\*\*(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)\*\*/g,
      (_m, c, t) => `<strong${c ? ` style="color:${c}"` : ""}>${t}</strong>`,
    )
    .replace(
      /~~(?:\{(#[0-9a-fA-F]{6})\})?([\s\S]*?)~~/g,
      (_m, c, t) => `<em${c ? ` style="color:${c}"` : ""}>${t}</em>`,
    );
}

/** Teks polos lama → HTML ringkas (paragraf, label, daftar pertanyaan). */
export function teksKeHtml(isi: string): string {
  const keluar: string[] = [];
  const blok = isi
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  for (let i = 0; i < blok.length; i++) {
    const t = blok[i];
    if (t.includes("Bacalah beberapa kali")) {
      const idx = t.indexOf("Bacalah beberapa kali");
      const rujuk = t.slice(0, idx).trim();
      keluar.push(
        rujuk
          ? `<p><strong style="color:#0000ff">${gayaLama(rujuk)}</strong></p>`
          : "",
      );
      keluar.push(`<p>${gayaLama(t.slice(idx))}</p>`);
      continue;
    }
    if (/^\d+\.\s/.test(t)) {
      const butir: string[] = [];
      let j = i;
      while (j < blok.length && /^\d+\.\s/.test(blok[j])) {
        butir.push(`<li>${gayaLama(blok[j].replace(/^\d+\.\s+/, ""))}</li>`);
        j++;
      }
      keluar.push(`<ol>${butir.join("")}</ol>`);
      i = j - 1;
      continue;
    }
    if (/^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan):$/.test(t)) {
      const merah = t.startsWith("Pengantar");
      keluar.push(
        `<h2><span style="color:${merah ? "#c0121a" : "#1a34c8"}">${escapeHtml(
          t.replace(/:$/, ""),
        )}</span></h2>`,
      );
      continue;
    }
    keluar.push(`<p>${gayaLama(t)}</p>`);
  }
  return keluar.filter(Boolean).join("");
}

/** Pecah HTML menjadi baris siap-render, dengan penanda baris "label PDF".
 *  Memakai pelacak kedalaman, bukan regex rakus, supaya tabel (yang berisi
 *  <p> di dalam <td>) dan daftar bersarang tidak terpecah salah. */
export function pecahIsi(isi: string): BarisIsi[] {
  const html = isiHtml(isi) ? isi : teksKeHtml(isi);
  const hasil: BarisIsi[] = [];
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\/?)>/g;
  const tumpukan: string[] = [];
  let mulai = -1;
  let namaBlok = "";
  let sisip = 0; // posisi akhir blok terakhir yang diambil

  const ambil = (sampai: number) => {
    if (mulai < 0) return;
    hasil.push(klasifikasi(namaBlok, html.slice(mulai, sampai)));
    sisip = sampai;
    mulai = -1;
    tumpukan.length = 0;
  };

  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tutup = m[1] === "/";
    const tag = m[2].toLowerCase();
    const mandiri = m[4] === "/" || TAG_HAPUS.has(tag);

    if (mulai < 0) {
      if (!tutup && TAG_BLOK.test(tag)) {
        if (mandiri) {
          hasil.push(klasifikasi(tag, html.slice(m.index, re.lastIndex)));
          sisip = re.lastIndex;
        } else {
          mulai = m.index;
          namaBlok = tag;
          tumpukan.push(tag);
        }
      }
      continue;
    }

    if (mandiri) continue;
    if (!tutup) {
      tumpukan.push(tag);
    } else {
      const i = tumpukan.lastIndexOf(tag);
      if (i < 0) continue; // penutup tanpa pasangan — abaikan
      tumpukan.length = i;
      if (tumpukan.length === 0) ambil(re.lastIndex);
    }
  }
  if (mulai >= 0) ambil(html.length);

  // Teks substansial di luar blok mana pun (jarang) tetap ditampilkan.
  const sisa = html.slice(sisip).replace(/<[^>]+>/g, " ").trim();
  if (sisa) hasil.push({ jenis: "paragraf", html: `<p>${escapeHtml(sisa)}</p>` });

  return hasil;
}

/** Kelas satu blok HTML utuh (tag pembuka sudah termasuk di dalamnya). */
function klasifikasi(tag: string, blok: string): BarisIsi {
  if (tag === "hr") return { jenis: "pemisah", html: blok };
  if (tag === "table") return { jenis: "tabel", html: blok };
  if (tag === "pre") return { jenis: "kode", html: blok };
  if (tag === "blockquote") return { jenis: "kutipan", html: blok };
  if (tag === "ul" && /data-type\s*=\s*["']?taskList/i.test(blok))
    return { jenis: "tugas", html: blok };
  if (tag === "ol" || tag === "ul") return { jenis: "daftar", html: blok };
  if (/^h[1-6]$/.test(tag)) {
    const teks = blok.replace(/<[^>]+>/g, "").replace(/:$/, "").trim();
    const labelPdf = /^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan)$/.test(teks);
    return { jenis: labelPdf ? "label" : Number(tag[1]) <= 2 ? "h2" : "h3", html: blok };
  }
  return { jenis: "paragraf", html: blok };
}

/** Ringkasan cadangan: beberapa kalimat awal isi (tanpa instruksi "Bacalah…"). */
export function ringkasanOtomatis(isi: string, maksKalimat = 2, maksHuruf = 320): string {
  const html = isiHtml(isi) ? isi : teksKeHtml(isi);
  const paragraf = html
    .split(/<\/(?:p|h1|h2|h3|li|blockquote)>/i)
    .map((x) =>
      x
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(
      (t) =>
        t.length > 0 &&
        !t.includes("Bacalah beberapa kali") &&
        !/^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan)$/i.test(t) &&
        !/^\d+\./.test(t),
    );

  const teks = paragraf.join(" ");
  if (!teks) return "";
  const kalimat = teks.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) ?? [teks];
  let keluar = "";
  for (const k of kalimat.slice(0, maksKalimat)) {
    if ((keluar + k).trim().length > maksHuruf) break;
    keluar += k;
  }
  keluar = (keluar || kalimat[0]).trim();
  if (keluar.length > maksHuruf) {
    keluar = keluar.slice(0, maksHuruf).replace(/\s+\S*$/, "") + "…";
  }
  return keluar;
}

/** Teks polos dari HTML (untuk hitung kata / pratinjau). */
export function teksPolos(isi: string): string {
  const html = isiHtml(isi) ? isi : teksKeHtml(isi);
  return html
    .replace(/<\/(?:p|h1|h2|h3|li|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Keamanan & tautan ayat ----

/** Buang tag berbahaya dan atribut peristiwa; sisakan format teks. */
export function sanitasiHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|link|meta)\b[^>]*\/?>/gi, "")
    // Kotak centang daftar tugas boleh ada, tapi dibuat mati agar tak bisa diklik.
    .replace(/<input\b[^>]*>/gi, (tag) =>
      /type\s*=\s*["']?checkbox/i.test(tag)
        ? `<input type="checkbox" disabled${/checked/i.test(tag) ? " checked" : ""}>`
        : "",
    )
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/\sstyle\s*=\s*("|')([^"']*)\1/gi, (_m, q, isi) => {
      const aman = String(isi)
        .split(";")
        .filter((x) =>
          /^\s*(color|background-color|text-align|font-size|line-height)\s*:/i.test(x),
        )
        .join(";");
      return aman ? ` style=${q}${aman}${q}` : "";
    });
}

const escapeAtr = (s: string) => s.replace(/"/g, "&quot;");

/**
 * Ubah setiap rujukan ayat di dalam teks HTML menjadi tombol pembuka ayat.
 * Hanya menyentuh potongan teks (di luar tag), jadi atribut tidak ikut diubah.
 */
export function tautkanAyatHtml(html: string, rujukanRegex: RegExp): string {
  return html
    .split(/(<[^>]*>)/g)
    .map((potong) => {
      if (!potong || potong.startsWith("<")) return potong;
      const re = new RegExp(rujukanRegex.source, rujukanRegex.flags.includes("g") ? rujukanRegex.flags : rujukanRegex.flags + "g");
      re.lastIndex = 0;
      let keluar = "";
      let terakhir = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(potong)) !== null) {
        if (m.index > terakhir) keluar += potong.slice(terakhir, m.index);
        const teks = m[0].trim();
        keluar += `<button type="button" class="tautan-ayat" data-rujukan="${escapeAtr(
          teks,
        )}">${teks}</button>`;
        terakhir = re.lastIndex;
        if (re.lastIndex === m.index) re.lastIndex++;
      }
      return keluar + potong.slice(terakhir);
    })
    .join("");
}

