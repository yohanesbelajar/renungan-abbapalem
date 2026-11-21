// ALAT UKUR SEMENTARA — hapus setelah diagnosis selesai.
// Menjalankan rangkaian kueri yang sama dengan halaman /arsip dan melaporkan
// waktu tiap tahap, supaya jelas 18 detik itu habis di mana (jaringan ke
// Supabase, jumlah perjalanan, atau pemrosesan).
import { NextResponse } from "next/server";
import { anonClient } from "@/lib/supabase/anon";
import { kartuArsip } from "@/lib/arsip";
import { semuaRingkas } from "@/lib/publik";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const KOLOM = ["title", "summary", "theme", "body", "verse_reference"];
const SELECT = "slug, devotion_date, title, theme, hearts_count";

async function jam<T>(label: string, f: () => Promise<T>, hasil: Record<string, unknown>) {
  const t = Date.now();
  try {
    const r = await f();
    const d = Date.now() - t;
    hasil[label] = { ms: d, ok: true };
    return { r, d };
  } catch (e) {
    hasil[label] = { ms: Date.now() - t, ok: false, galat: String(e) };
    return { r: null as T, d: Date.now() - t };
  }
}

export async function GET(request: Request) {
  const cari = new URL(request.url).searchParams.get("cari") ?? "doa";
  const hasil: Record<string, unknown> = {};
  const awal = Date.now();

  // 1. Satu baris saja — biaya dasar perjalanan ke Supabase.
  await jam("1_baris", async () => {
    const { data, error } = await anonClient()
      .from("devotions").select("id").limit(1);
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }, hasil);

  // 2. Kueri pencarian langsung (1 pola x 5 kolom, tanpa cache).
  const pola = KOLOM.map((k) => `${k}.ilike.*${cari}*`).join(",");
  await jam(`cari_${cari}`, async () => {
    const { data, error } = await anonClient()
      .from("devotions")
      .select(SELECT)
      .eq("status", "published")
      .or(pola)
      .order("devotion_date", { ascending: false })
      .range(0, 999);
    if (error) throw new Error(error.message);
    return data?.length ?? 0;
  }, hasil);

  // 3. Ringkasan tanggal+tema (dipakai daftar tahun/bulan).
  await jam("ringkas", async () => {
    const r = await semuaRingkas();
    return r.length;
  }, hasil);

  // 4. Jalur lengkap seperti halaman arsip (cache ikut dihitung).
  const { d: msKartu } = await jam("kartu_cache_1", async () => {
    const r = await kartuArsip({ cari, cakupan: "semua", tahun: "", bulan: "", tema: "" });
    return r.devotions.length;
  }, hasil);
  await jam("kartu_cache_2", async () => {
    const r = await kartuArsip({ cari, cakupan: "semua", tahun: "", bulan: "", tema: "" });
    return r.devotions.length;
  }, hasil);

  return NextResponse.json({
    total_ms: Date.now() - awal,
    kartu_pertama_ms: msKartu,
    region: process.env.VERCEL_REGION ?? "(lokal)",
    tahap: hasil,
  });
}
