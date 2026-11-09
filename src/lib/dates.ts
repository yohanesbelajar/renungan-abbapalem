// Util tanggal zona Asia/Jakarta
export const TZ = "Asia/Jakarta";

// Tanggal "hari ini" dalam bentuk YYYY-MM-DD (zona Jakarta)
export function todayJakarta(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// Format tanggal Indonesia: "9 November 2026"
export function formatTanggalID(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00+07:00" : ""));
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

// Slug sederhana dari judul (a-z0-9, tanpa library)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
