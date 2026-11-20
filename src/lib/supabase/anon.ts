import { createClient } from "@supabase/supabase-js";

// Klien anonim TANPA cookie — untuk data publik yang boleh di-cache
// (sitemap, halaman topik, ringkasan arsip). Tidak menyentuh cookies(),
// jadi aman dipakai di dalam unstable_cache dan route yang di-prerender.
export function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "Accept-Profile": "public" } },
    }
  );
}
