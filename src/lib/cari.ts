// Pencarian arsip Saat Teduh.
//
// Dua lapis:
//  1. FRASA — istilah dicocokkan utuh, dengan varian:
//     - spasi sebelum angka ("Matius9" → "Matius 9")
//     - perluasan singkatan kitab ("Yoh 3:16" → "Yohanes 3:16", "1 Tes 2:2" → "1 Tesalonika 2:2")
//  2. KATA PER KATA — dipakai HANYA bila frasa nol hasil: semua kata harus
//     ditemukan di kolom mana pun (terpisah), supaya pencarian frasa yang
//     terlalu kaku tidak langsung buntu.
//
// Semua karakter khusus sintaks PostgREST dibuang dari istilah pengguna.

// Karakter yang dibuang dari istilah pengguna: sintaks PostgREST + tanda baca
// yang sengaja diketik pengguna (mis. “jiwa” dengan kutip → tetap cocok).
const KHUSUS = /[%,*()_"“”‘’?!;…]/g;

export function sanitize(q: string): string {
  return q
    .replace(KHUSUS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.]+|[.]+$/g, "") // titik di awal/akhir
    .trim()
    .slice(0, 120);
}

// Kolom yang dicari. verse_reference = ayat bacaan pada kartu.
export const KOL_CARI = [
  "title",
  "summary",
  "theme",
  "body",
  "verse_reference",
];

// Kitab: kanonik + singkatan lazim (pencocokan tanpa memperhatikan huruf besar/kecil & titik)
const KITAB: string[][] = [
  ["Kejadian", "Kej", "Gen"],
  ["Keluaran", "Kel", "Ex"],
  ["Imamat", "Im", "Lev"],
  ["Bilangan", "Bil", "Num"],
  ["Ulangan", "Ul"],
  ["Yosua", "Yos"],
  ["Hakim-hakim", "Hak"],
  ["Rut", "Rt"],
  ["1 Samuel", "1 Sam", "1Sm"],
  ["2 Samuel", "2 Sam", "2Sm"],
  ["1 Raja-raja", "1 Raja", "1Raja"],
  ["2 Raja-raja", "2 Raja", "2Raja"],
  ["1 Tawarikh", "1 Taw", "1Taw"],
  ["2 Tawarikh", "2 Taw", "2Taw"],
  ["Ezra", "Ezr"],
  ["Nehemia", "Neh"],
  ["Ester", "Est"],
  ["Ayub", "Ayub"],
  ["Mazmur", "Mzm", "Mm"],
  ["Amsal", "Ams"],
  ["Pengkhotbah", "Pengk", "Pkh"],
  ["Kidung Agung", "Kid"],
  ["Yesaya", "Yes"],
  ["Yeremia", "Yer"],
  ["Ratapan", "Rat"],
  ["Yeheskiel", "Yeh", "Ezk"],
  ["Daniel", "Dan"],
  ["Hosea", "Hos"],
  ["Yoel", "Yl", "Yol"],
  ["Amos", "Am"],
  ["Obaja", "Ob"],
  ["Yunus", "Yun"],
  ["Mikha", "Mik"],
  ["Nahum", "Nah"],
  ["Habakuk", "Hab"],
  ["Zefanya", "Zef"],
  ["Hagai", "Hag"],
  ["Zakharia", "Zakh", "Zak"],
  ["Maleakhi", "Mal"],
  ["Matius", "Mat", "Mt"],
  ["Markus", "Mr", "Mk"],
  ["Lukas", "Lk"],
  ["Yohanes", "Yoh", "Yn"],
  ["Kisah Para Rasul", "Kisah", "Kis", "Kispara"],
  ["Roma", "Rom"],
  ["1 Korintus", "1 Kor", "1Kor"],
  ["2 Korintus", "2 Kor", "2Kor"],
  ["Galatia", "Gal"],
  ["Efesus", "Ef"],
  ["Filipi", "Fil", "Flp"],
  ["Kolose", "Kol"],
  ["1 Tesalonika", "1 Tes", "1Tes"],
  ["2 Tesalonika", "2 Tes", "2Tes"],
  ["1 Timotius", "1 Tim", "1Tim"],
  ["2 Timotius", "2 Tim", "2Tim"],
  ["Titus", "Tito"],
  ["Filemon", "Flm"],
  ["Ibrani", "Ibr"],
  ["Yakobus", "Yak"],
  ["1 Petrus", "1 Pet", "1Pet"],
  ["2 Petrus", "2 Pet", "2Pet"],
  ["1 Yohanes", "1 Yoh", "1Yoh"],
  ["2 Yohanes", "2 Yoh", "2Yoh"],
  ["3 Yohanes", "3 Yoh", "3Yoh"],
  ["Yudas", "Yds"],
  ["Wahyu", "Wah", "Why"],
];

// Peta: normalisasi(anggota) → kelompok kitab
const PETA_KITAB = new Map<string, string[]>();
for (const g of KITAB) {
  for (const m of g) {
    const k = norm(m);
    if (!PETA_KITAB.has(k)) PETA_KITAB.set(k, g);
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

/** Ganti token kitab di satu kalimat dengan tiap alias-nya. */
function perluasKitab(s: string): string[] {
  const t = s.split(" ");
  for (let i = 0; i < t.length; i++) {
    // pasangan "1 Tes" / "1Tes" (angka jilid menempel atau terpisah)
    if (/^[123]$/.test(t[i]) && i + 1 < t.length) {
      const kunci = `${t[i]} ${t[i + 1]}`;
      const g = PETA_KITAB.get(norm(kunci)) ?? PETA_KITAB.get(t[i] + t[i + 1]);
      if (g)
        return g.map((m) =>
          [...t.slice(0, i), m, ...t.slice(i + 2)].join(" ")
        );
    }
    const g = PETA_KITAB.get(norm(t[i]));
    if (g)
      return g.map((m) => [...t.slice(0, i), m, ...t.slice(i + 1)].join(" "));
  }
  return [];
}

const BATAS_POLA = 12;

/** Semua varian frasa untuk satu istilah pencarian. */
export function polaFrasa(cari: string): string[] {
  const dasar = sanitize(cari);
  if (!dasar) return [];
  const dasarDigit = dasar.replace(/(\D)(\d)/g, "$1 $2").replace(/\s+/g, " ");
  const pola = new Set<string>([dasar]);
  if (dasarDigit !== dasar) pola.add(dasarDigit);
  // Perluasan kitab hanya untuk istilah pendek (pertanyaan panjang hampir
  // selalu tanpa rujukan kitab, dan memperbanyak pola memanjangkan URL)
  if (dasar.split(" ").length <= 6) {
    for (const s of [...pola]) {
      for (const v of perluasKitab(s)) pola.add(v);
      if (pola.size >= BATAS_POLA) break;
    }
  }
  return [...pola].slice(0, BATAS_POLA);
}

const BATAS_KATA = 12;

/**
 * Kata per kata untuk lapis kedua. Dipisah sebelum angka juga supaya
 * "Matius9" menjadi ["matius", "9"].
 */
export function kataPencarian(cari: string): string[] {
  const dasar = sanitize(cari);
  if (!dasar) return [];
  const gabung = `${dasar} ${dasar.replace(/(\D)(\d)/g, "$1 $2")}`;
  const kata = [...new Set(gabung.split(/\s+/).filter((k) => k.length > 0))];
  return kata.slice(0, BATAS_KATA);
}

/** Satu grup OR: kolom-kolom cocok untuk satu istilah. */
export function grupKata(istilah: string): string {
  return KOL_CARI.map((c) => `${c}.ilike.*${istilah}*`).join(",");
}
