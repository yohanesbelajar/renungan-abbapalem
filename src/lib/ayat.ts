// Utilitas rujukan ayat: mengenali rujukan (mis. "Yesaya 6:1-8") di dalam teks,
// memetakan nama kitab ke berkas JSON kitab di /alkitab/<kode>.json,
// dan mengumpulkan ayat-ayat yang dimaksud.

export type Kitab = {
  nama: string;
  kode: string;
  pasal: string[][]; // pasal[n] = daftar ayat pasal n+1
};

export type Rentang = {
  pasal: number;
  ayat?: number; // tanpa arti = sampai ayat terakhir pasal
};

export type Rujukan = {
  tampil: string; // teks rujukan sebagaimana ditulis
  kode: string;
  nama: string;
  awal: Rentang;
  akhir: Rentang | null; // null = sampai akhir pasal awal
};

// Nama kitab sesuai Terjemahan Baru + singkatan yang lazim dipakai.
const KANONIK = [
  "Kejadian", "Keluaran", "Imamat", "Bilangan", "Ulangan", "Yosua", "Hakim-hakim", "Rut",
  "1 Samuel", "2 Samuel", "1 Raja-raja", "2 Raja-raja", "1 Tawarikh", "2 Tawarikh",
  "Ezra", "Nehemia", "Ester", "Ayub", "Mazmur", "Amsal", "Pengkhotbah", "Kidung Agung",
  "Yesaya", "Yeremia", "Ratapan", "Yeheskiel", "Daniel", "Hosea", "Yoel", "Amos",
  "Obaja", "Yunus", "Mika", "Nahum", "Habakuk", "Zefanya", "Hagai", "Zakharia",
  "Maleakhi", "Matius", "Markus", "Lukas", "Yohanes", "Kisah Para Rasul", "Roma",
  "1 Korintus", "2 Korintus", "Galatia", "Efesus", "Filipi", "Kolose",
  "1 Tesalonika", "2 Tesalonika", "1 Timotius", "2 Timotius", "Titus", "Filemon",
  "Ibrani", "Yakobus", "1 Petrus", "2 Petrus", "1 Yohanes", "2 Yohanes", "3 Yohanes",
  "Yudas", "Wahyu",
];

const SINGKATAN: Record<string, string> = {
  Kej: "Kejadian", Kel: "Keluaran", Ima: "Imamat", Bil: "Bilangan", Ula: "Ulangan",
  Yos: "Yosua", Hak: "Hakim-hakim",
  "1Sa": "1 Samuel", "1 Sam": "1 Samuel", "1 Sam.": "1 Samuel",
  "2Sa": "2 Samuel", "2 Sam": "2 Samuel", "2 Sam.": "2 Samuel",
  "1Ra": "1 Raja-raja", "1 Raj": "1 Raja-raja", "1 Raj.": "1 Raja-raja",
  "2Ra": "2 Raja-raja", "2 Raj": "2 Raja-raja", "2 Raj.": "2 Raja-raja",
  "1Ta": "1 Tawarikh", "1 Taw": "1 Tawarikh", "1 Taw.": "1 Tawarikh",
  "2Ta": "2 Tawarikh", "2 Taw": "2 Tawarikh", "2 Taw.": "2 Tawarikh",
  Ezr: "Ezra", Neh: "Nehemia", Est: "Ester", Ayb: "Ayub", Mzm: "Mazmur",
  Ams: "Amsal", Pkh: "Pengkhotbah", Kid: "Kidung Agung",
  Yes: "Yesaya", Yer: "Yeremia", Rat: "Ratapan", Yeh: "Yeheskiel",
  Hos: "Hosea", Yoe: "Yoel", Amo: "Amos", Oba: "Obaja", Yun: "Yunus",
  Mik: "Mika", Nah: "Nahum", Hab: "Habakuk", Zef: "Zefanya", Hag: "Hagai",
  Zak: "Zakharia", Mal: "Maleakhi",
  Mat: "Matius", Mrk: "Markus", Luk: "Lukas", Yoh: "Yohanes",
  Kis: "Kisah Para Rasul",
  "1Ko": "1 Korintus", "1 Kor": "1 Korintus", "1 Kor.": "1 Korintus",
  "2Ko": "2 Korintus", "2 Kor": "2 Korintus", "2 Kor.": "2 Korintus",
  Gal: "Galatia", Efe: "Efesus", Flp: "Filipi", Kol: "Kolose",
  "1Te": "1 Tesalonika", "1 Tes": "1 Tesalonika", "1 Tes.": "1 Tesalonika",
  "2Te": "2 Tesalonika", "2 Tes": "2 Tesalonika", "2 Tes.": "2 Tesalonika",
  "1Ti": "1 Timotius", "1 Tim": "1 Timotius", "1 Tim.": "1 Timotius",
  "2Ti": "2 Timotius", "2 Tim": "2 Timotius", "2 Tim.": "2 Timotius",
  Tit: "Titus", Flm: "Filemon", Ibr: "Ibrani", Yak: "Yakobus",
  "1Pt": "1 Petrus", "1 Pet": "1 Petrus", "1 Pet.": "1 Petrus",
  "2Pt": "2 Petrus", "2 Pet": "2 Petrus", "2 Pet.": "2 Petrus",
  "1Yo": "1 Yohanes", "1 Yoh": "1 Yohanes", "1 Yoh.": "1 Yohanes",
  "2Yo": "2 Yohanes", "2 Yoh": "2 Yohanes", "2 Yoh.": "2 Yohanes",
  "3Yo": "3 Yohanes", "3 Yoh": "3 Yohanes", "3 Yoh.": "3 Yohanes",
  Yud: "Yudas", Why: "Wahyu",
};

// Kode kitab di alkitab.mobi, sesuai urutan 66 kitab.
const KODE: Record<string, string> = {
  "Kejadian": "Kej", "Keluaran": "Kel", "Imamat": "Ima", "Bilangan": "Bil",
  "Ulangan": "Ula", "Yosua": "Yos", "Hakim-hakim": "Hak", "Rut": "Rut",
  "1 Samuel": "1Sa", "2 Samuel": "2Sa", "1 Raja-raja": "1Ra", "2 Raja-raja": "2Ra",
  "1 Tawarikh": "1Ta", "2 Tawarikh": "2Ta", "Ezra": "Ezr", "Nehemia": "Neh",
  "Ester": "Est", "Ayub": "Ayb", "Mazmur": "Mzm", "Amsal": "Ams",
  "Pengkhotbah": "Pkh", "Kidung Agung": "Kid", "Yesaya": "Yes", "Yeremia": "Yer",
  "Ratapan": "Rat", "Yeheskiel": "Yeh", "Daniel": "Dan", "Hosea": "Hos",
  "Yoel": "Yoe", "Amos": "Amo", "Obaja": "Oba", "Yunus": "Yun", "Mika": "Mik",
  "Nahum": "Nah", "Habakuk": "Hab", "Zefanya": "Zef", "Hagai": "Hag",
  "Zakharia": "Zak", "Maleakhi": "Mal", "Matius": "Mat", "Markus": "Mrk",
  "Lukas": "Luk", "Yohanes": "Yoh", "Kisah Para Rasul": "Kis", "Roma": "Rom",
  "1 Korintus": "1Ko", "2 Korintus": "2Ko", "Galatia": "Gal", "Efesus": "Efe",
  "Filipi": "Flp", "Kolose": "Kol", "1 Tesalonika": "1Te", "2 Tesalonika": "2Te",
  "1 Timotius": "1Ti", "2 Timotius": "2Ti", "Titus": "Tit", "Filemon": "Flm",
  "Ibrani": "Ibr", "Yakobus": "Yak", "1 Petrus": "1Pt", "2 Petrus": "2Pt",
  "1 Yohanes": "1Yo", "2 Yohanes": "2Yo", "3 Yohanes": "3Yo", "Yudas": "Yud",
  "Wahyu": "Why",
};

// Semua bentuk yang dikenali: nama kanonik + singkatan, dipakai sebagai alternatif regex.
const SEMUA_BENTUK: { bentuk: string; nama: string }[] = [
  ...KANONIK.map((nama) => ({ bentuk: nama, nama })),
  ...Object.entries(SINGKATAN).map(([bentuk, nama]) => ({ bentuk, nama })),
].sort((a, b) => b.bentuk.length - a.bentuk.length);

function lolos(bentuk: string): string {
  return bentuk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Rujukan: [nama kitab] [.?] [spasi] [pasal] [ : ayat [- [pasal :] ayat] | - pasal ]
const RE_POLA = SEMUA_BENTUK.map((b) => lolos(b.bentuk)).join("|");
export const RE_RUJUKAN = new RegExp(
  `(?<![A-Za-z0-9])(${RE_POLA})\\.?\\s+(\\d{1,3})(?::(\\d{1,3})(?:-(?:(\\d{1,3}):)?(\\d{1,3}))?|(?:\\s*-\\s*(\\d{1,3}))?)(?![\\d:])`,
  "g",
);

const NAMA_KE_KODE = KODE;
const BENTUK_KE_NAMA = new Map(SEMUA_BENTUK.map((b) => [b.bentuk, b.nama]));

/** Kenali satu rujukan pada posisi regex; kembalikan null bila bukan rujukan. */
export function bacaRujukan(m: RegExpExecArray): Rujukan | null {
  const bentuk = m[1];
  const nama = BENTUK_KE_NAMA.get(bentuk);
  const kode = nama ? NAMA_KE_KODE[nama] : undefined;
  if (!nama || !kode) return null;

  const pasal = parseInt(m[2], 10);
  const ayatAwal = m[3] !== undefined ? parseInt(m[3], 10) : undefined;
  const pasalAkhir = m[4] !== undefined ? parseInt(m[4], 10) : undefined;
  const ayatAkhir = m[5] !== undefined ? parseInt(m[5], 10) : undefined;
  const rentangPasal = m[6] !== undefined ? parseInt(m[6], 10) : undefined;

  let awal: Rentang;
  let akhir: Rentang | null = null;
  if (rentangPasal !== undefined) {
    awal = { pasal };
    akhir = { pasal: rentangPasal };
  } else if (ayatAwal === undefined) {
    awal = { pasal }; // seluruh pasal
  } else if (pasalAkhir !== undefined && ayatAkhir !== undefined) {
    awal = { pasal, ayat: ayatAwal };
    akhir = { pasal: pasalAkhir, ayat: ayatAkhir };
  } else if (ayatAkhir !== undefined) {
    awal = { pasal, ayat: ayatAwal };
    akhir = { pasal, ayat: ayatAkhir };
  } else {
    awal = { pasal, ayat: ayatAwal };
    akhir = { pasal, ayat: ayatAwal };
  }

  return { tampil: m[0].trim(), kode, nama, awal, akhir };
}

/** Belanja seluruh rujukan dalam sebuah teks (urutan kemunculan). */
export function cariRujukan(teks: string): Rujukan[] {
  const hasil: Rujukan[] = [];
  RE_RUJUKAN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RE_RUJUKAN.exec(teks)) !== null) {
    const r = bacaRujukan(m);
    if (r) hasil.push(r);
    if (RE_RUJUKAN.lastIndex === m.index) RE_RUJUKAN.lastIndex++;
  }
  return hasil;
}

/** Kenali satu rujukan dari satu potongan teks utuh. */
export function parseRujukan(teks: string): Rujukan | null {
  const daftar = cariRujukan(teks);
  return daftar.length > 0 ? daftar[0] : null;
}

/** Teks rujukan yang enak dibaca: "Yesaya 6:1-8". */
export function tampilkanRujukan(r: Rujukan): string {
  const a = r.awal;
  const awal = a.ayat !== undefined ? `${a.pasal}:${a.ayat}` : `${a.pasal}`;
  if (!r.akhir) return `${r.nama} ${awal}`;
  const b = r.akhir;
  if (b.pasal === a.pasal) {
    if (b.ayat === a.ayat) return `${r.nama} ${awal}`;
    if (b.ayat === undefined) return `${r.nama} ${a.pasal}-${b.pasal}`;
    return `${r.nama} ${awal}-${b.ayat}`;
  }
  const akhir = b.ayat !== undefined ? `${b.pasal}:${b.ayat}` : `${b.pasal}`;
  return `${r.nama} ${awal}-${akhir}`;
}

// ---- Muat teks kitab (sekali per kitab, disimpan di memori) ----

const cacheKitab = new Map<string, Promise<Kitab>>();

export function muatKitab(kode: string): Promise<Kitab> {
  let janji = cacheKitab.get(kode);
  if (!janji) {
    janji = fetch(`/alkitab/${kode.toLowerCase()}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Kitab>;
      })
      .catch((e) => {
        cacheKitab.delete(kode); // biar bisa dicoba lagi kali berikutnya
        throw e;
      });
    cacheKitab.set(kode, janji);
  }
  return janji;
}

export type AyatTerpilih = { pasal: number; ayat: number; teks: string };

/** Kumpulkan ayat-ayat sesuai rujukan (dipanggil setelah kitab dimuat). */
export function kumpulAyat(kitab: Kitab, r: Rujukan): AyatTerpilih[] {
  const hasil: AyatTerpilih[] = [];
  const pasalAwal = r.awal.pasal;
  const pasalAkhir = r.akhir ? r.akhir.pasal : r.awal.pasal;
  for (let c = pasalAwal; c <= pasalAkhir; c++) {
    const ayatPasal = kitab.pasal[c - 1];
    if (!ayatPasal) continue;
    const dari = c === pasalAwal && r.awal.ayat !== undefined ? r.awal.ayat : 1;
    const sampai =
      r.akhir && c === r.akhir.pasal
        ? r.akhir.ayat ?? ayatPasal.length
        : c === pasalAwal && !r.akhir
          ? ayatPasal.length
          : r.akhir
            ? ayatPasal.length
            : ayatPasal.length;
    for (let v = dari; v <= Math.min(sampai, ayatPasal.length); v++) {
      hasil.push({ pasal: c, ayat: v, teks: ayatPasal[v - 1] });
    }
  }
  return hasil;
}
