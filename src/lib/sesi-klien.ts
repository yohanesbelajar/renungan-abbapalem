// Sesi pengunjung dibaca di sisi klien, BUKAN di server.
//
// Sebelumnya Header adalah server component yang memanggil cookies() lewat
// createClient() — akibatnya SETIAP halaman ditandai "private, no-store" dan
// tidak pernah masuk cache CDN, termasuk untuk pengunjung yang belum login.
// Sekarang sesi diambil sekali di browser lalu dipakai bersama oleh tombol
// akun dan menu HP; server tidak menyentuh cookie sama sekali.

import { createClient } from "./supabase/client";

export type Sesi = { masuk: boolean; staf: boolean };

let janji: Promise<Sesi> | null = null;
let pendengarTerpasang = false;

async function ambil(): Promise<Sesi> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { masuk: false, staf: false };
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const r = (data as { role?: string } | null)?.role;
  return {
    masuk: true,
    staf: r === "admin" || r === "editor" || r === "superadmin",
  };
}

/** Sesi bersama: satu permintaan untuk seluruh halaman, bukan satu per komponen. */
export function muatSesi(): Promise<Sesi> {
  if (!janji) janji = ambil().catch(() => ({ masuk: false, staf: false }));
  if (!pendengarTerpasang) {
    pendengarTerpasang = true;
    // Setelah keluar/masuk, buang hasil lama supaya komponen memuat ulang.
    createClient().auth.onAuthStateChange(() => {
      janji = null;
    });
  }
  return janji;
}

/** Dipakai sebelum navigasi keluar — jangan biarkan status lama terbawa. */
export function lupakanSesi() {
  janji = null;
}
