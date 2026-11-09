// Penerbitan terjadwal: ubah status 'scheduled' menjadi 'published'
// saat waktunya tiba. Dipasang di Vercel Cron (berjalan tiap menit).
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


// Dipanggil oleh Vercel Cron — aman: kunci layanan wajib ada.
async function publishDue() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return new NextResponse("service key missing", { status: 500 });
  }
  const { createServiceClient } = await import("@/lib/supabase/service");
  const supabase = createServiceClient();
  const now = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("devotions")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now);
  if (error) return new NextResponse(error.message, { status: 500 });
  for (const d of due ?? []) {
    await supabase
      .from("devotions")
      .update({ status: "published", published_at: now })
      .eq("id", d.id);
  }
  return NextResponse.json({ published: due?.length ?? 0 });
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return new NextResponse("unauthorized", { status: 401 });
  }
  return publishDue();
}

// Fallback lokal (dev): tanpa CRON_SECRET, endpoint menolak.
