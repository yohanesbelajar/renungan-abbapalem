// Isi saat teduh kini disimpan sebagai HTML dari editor Tiptap,
// tetapi baris lama masih berupa teks polos (paragraf dipisah satu baris kosong).
// Semua pembaca wajib lewat di sini supaya keduanya tampil sama.

export type BarisIsi = {
  jenis: "paragraf" | "h2" | "h3" | "label" | "daftar" | "kutipan";
  html: string;
};

const RE_TAG = /<\/?[a-z][^>]*>/i;

export function isiHtml(isi: string): boolean {
  return RE_TAG.test(isi);
}

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

/** Pecah HTML menjadi baris siap-render, dengan penanda baris "label PDF". */
export function pecahIsi(isi: string): BarisIsi[] {
  const html = isiHtml(isi) ? isi : teksKeHtml(isi);
  const hasil: BarisIsi[] = [];
  const re = /<(h1|h2|h3|p|ol|ul|blockquote|hr)\b([^>]*)>([\s\S]*?)<\/\1>|<hr\b[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (!m[1]) {
      hasil.push({ jenis: "paragraf", html: "<hr/>" });
      continue;
    }
    const tag = m[1].toLowerCase();
    const dalam = m[3].trim();
    if (!dalam && tag !== "hr") continue;
    if (tag === "h1" || tag === "h2" || tag === "h3") {
      const teks = dalam.replace(/<[^>]+>/g, "").replace(/:$/, "").trim();
      const labelPdf = /^(Pengantar|Pengajaran|Penerapan|Renungan|Pertanyaan)$/.test(teks);
      hasil.push({
        jenis: tag === "h3" ? "h3" : labelPdf ? "label" : "h2",
        html: dalam,
      });
      continue;
    }
    if (tag === "ol" || tag === "ul") {
      hasil.push({ jenis: "daftar", html: `<${tag}>${m[3]}</${tag}>` });
      continue;
    }
    if (tag === "blockquote") {
      hasil.push({ jenis: "kutipan", html: dalam });
      continue;
    }
    hasil.push({ jenis: "paragraf", html: dalam });
  }
  return hasil;
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
    .replace(/<\s*(script|style|iframe|object|embed|form|input|link|meta)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|style|iframe|object|embed|form|input|link|meta)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, "")
    .replace(/\sstyle\s*=\s*("|')([^"']*)\1/gi, (_m, q, isi) => {
      const aman = String(isi)
        .split(";")
        .filter((x) => /^\s*(color|background-color|text-align)\s*:/i.test(x))
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

