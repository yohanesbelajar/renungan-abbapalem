export type DevotionStatus = "draft" | "scheduled" | "published" | "archived";

export interface Devotion {
  id: string;
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  body: string;
  verse_reference: string;
  verse_text: string;
  theme: string | null;
  author: string | null;
  status: DevotionStatus;
  featured_image_url: string | null;
  scheduled_at: string | null;
  published_at: string | null;
  hearts_count: number;
}

export interface DevotionCard {
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  theme: string | null;
  hearts_count: number;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: "member" | "editor" | "admin";
  created_at: string;
}
