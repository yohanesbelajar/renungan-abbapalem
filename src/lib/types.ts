export type DevotionStatus = "draft" | "scheduled" | "published" | "archived";

export interface Devotion {
  id: string;
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  body: string;
  theme: string | null;
  author: string | null;
  status: DevotionStatus;
  scheduled_at: string | null;
  published_at: string | null;
  hearts_count: number;
}

export interface DevotionCard {
  slug: string;
  devotion_date: string;
  title: string;
  // Ringkasan TIDAK dipakai kartu mana pun (permintaan Jo 12 Nov 2026). Kolomnya
  // tidak diambil lagi di daftar arsip/beranda/topik — 52 KB per 1.000 baris —
  // jadi opsional di sini. Halaman edisi tetap mengambilnya untuk meta deskripsi.
  summary?: string;
  /** Diambil beranda saja (beberapa kalimat pembuka di hero). */
  body?: string;
  theme: string | null;
  hearts_count: number;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "member" | "editor" | "admin" | "superadmin";
  created_at: string;
}
