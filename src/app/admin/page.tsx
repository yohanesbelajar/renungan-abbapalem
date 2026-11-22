import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatTanggalID, todayJakarta } from "@/lib/dates";
import { ringkasanPengunjung } from "@/lib/pengunjung";
import KartuPengunjung from "@/components/KartuPengunjung";
import Kepala, { KotakAngka, LencanaStatus } from "@/components/admin/Kepala";
import {
  IkonCentang,
  IkonJam,
  IkonPlus,
  IkonTulis,
} from "@/components/admin/IkonAdmin";
import { IkonBuku, IkonHati } from "@/components/Ikon";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const today = todayJakarta();

  // Angka pengunjung hanya untuk super admin (permintaan Jo): admin & editor
  // tidak boleh melihatnya, jadi blok ini tidak dirender dan tidak diambil
  // sama sekali untuk peran lain.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: aku } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const superAdmin = aku?.role === "superadmin";
  let pengunjung = null;
  if (superAdmin) {
    try {
      pengunjung = await ringkasanPengunjung(14);
    } catch {
      pengunjung = null;
    }
  }

  const awalBulan = `${today.slice(0, 7)}-01`;

  const [hariIniRes, draftRes, terjadwalRes, terbitBulanRes, totalRes, hatiRes] = await Promise.all([
    supabase
      .from("devotions")
      .select("slug, title, status, theme")
      .eq("devotion_date", today)
      .maybeSingle(),
    supabase
      .from("devotions")
      .select("id, slug, title, devotion_date, status")
      .eq("status", "draft")
      .order("updated_at", { ascending: false })
      .limit(5),
    supabase
      .from("devotions")
      .select("id, slug, title, devotion_date, scheduled_at")
      .eq("status", "scheduled")
      .order("devotion_date")
      .limit(5),
    supabase
      .from("devotions")
      .select("id", { count: "exact", head: true })
      .eq("status", "published")
      .gte("devotion_date", awalBulan),
    supabase.from("devotions").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("devotions").select("hearts_count").eq("status", "published"),
  ]);

  const hariIni = hariIniRes.data;
  const drafts = draftRes.data ?? [];
  const terjadwal = terjadwalRes.data ?? [];
  const terbitBulan = terbitBulanRes.count ?? 0;
  const totalTerbit = totalRes.count ?? 0;
  const totalHati = (hatiRes.data ?? []).reduce(
    (n, b) => n + ((b as { hearts_count: number | null }).hearts_count ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <Kepala
        label="Ringkasan"
        judul="Dasbor"
        keterangan={`Keadaan situs hari ini, ${formatTanggalID(today)}.`}
        aksi={
          <Link href="/admin/saat-teduh/baru" className="btn btn-utama btn-sm">
            <IkonPlus className="h-4 w-4" />
            Tulis baru
          </Link>
        }
      />

      {/* ===== Edisi hari ini ===== */}
      <section className="overflow-hidden rounded-3xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
        <div className="relative px-5 py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(110%_100%_at_12%_-40%,#f3ecf8_0%,rgba(255,255,255,0)_70%),radial-gradient(85%_90%_at_92%_-50%,#fbe4c4_0%,rgba(255,255,255,0)_68%)]"
          />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="label-kecil text-ungu">Saat teduh hari ini</p>
              <span aria-hidden className="text-tinta-3">·</span>
              <p className="text-[12px] text-tinta-3">{formatTanggalID(today)}</p>
            </div>

            {hariIni ? (
              <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="judul-rapat-sm text-[22px] text-plum sm:text-[25px]">
                    {hariIni.title}
                  </h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <LencanaStatus status={hariIni.status} />
                    {hariIni.theme && (
                      <span className="rounded-full bg-lavender px-2.5 py-0.5 text-[11px] font-semibold text-ungu">
                        {hariIni.theme}
                      </span>
                    )}
                  </div>
                </div>
                <Link href={`/admin/saat-teduh/${hariIni.slug}`} className="btn btn-sekunder btn-sm">
                  <IkonTulis className="h-4 w-4" />
                  Edit edisi
                </Link>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="judul-rapat-sm text-[20px] text-plum">Belum ada edisi hari ini</h2>
                  <p className="mt-1 max-w-md text-[13.5px] leading-relaxed text-tinta-2">
                    Pengunjung yang membuka situs hari ini belum menemukan bacaan baru.
                  </p>
                </div>
                <Link href="/admin/saat-teduh/baru" className="btn btn-senja btn-sm">
                  <IkonPlus className="h-4 w-4" />
                  Tulis sekarang
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ===== Angka ringkas ===== */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KotakAngka label="Terbit bulan ini" nilai={terbitBulan} Ikon={IkonBuku} nada="ungu" />
        <KotakAngka label="Terjadwal" nilai={terjadwal.length} Ikon={IkonJam} nada="senja" />
        <KotakAngka label="Draft" nilai={drafts.length} Ikon={IkonTulis} nada="netral" />
        <KotakAngka label="Total terbit" nilai={totalTerbit} Ikon={IkonCentang} nada="hijau" />
      </div>

      {superAdmin && pengunjung && <KartuPengunjung data={pengunjung} />}

      {/* ===== Daftar kerja ===== */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
          <div className="flex items-center justify-between gap-3 border-b border-garis-tipis px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-krem-2 text-tinta-2">
                <IkonTulis className="h-[15px] w-[15px]" />
              </span>
              <h2 className="text-[14px] font-bold text-plum">Draft terakhir</h2>
            </div>
            <Link href="/admin/saat-teduh" className="-mx-1 rounded px-1 py-1 text-[12px] font-semibold text-ungu hover:underline">
              Semua
            </Link>
          </div>
          {drafts.length > 0 ? (
            <ul className="divide-y divide-garis-tipis">
              {drafts.map((d) => (
                <li key={d.id} data-draft={d.id}>
                  <Link
                    href={`/admin/saat-teduh/${d.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-krem-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-tinta">
                        {d.title}
                      </span>
                      <span className="block text-[11.5px] text-tinta-3">
                        {formatTanggalID(d.devotion_date)}
                      </span>
                    </span>
                    <span className="shrink-0 text-[12px] font-semibold text-ungu">Lanjutkan</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-[13px] text-tinta-3">Tidak ada draft menunggu.</p>
          )}
        </section>

        <section className="rounded-2xl border border-garis-tipis bg-kertas shadow-[var(--shadow-kartu)]">
          <div className="flex items-center justify-between gap-3 border-b border-garis-tipis px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-senja/15 text-jingga">
                <IkonJam className="h-[15px] w-[15px]" />
              </span>
              <h2 className="text-[14px] font-bold text-plum">Terjadwal</h2>
            </div>
            <span className="text-[11.5px] text-tinta-3">tayang otomatis</span>
          </div>
          {terjadwal.length > 0 ? (
            <ul className="divide-y divide-garis-tipis">
              {terjadwal.map((d) => (
                <li key={d.id} data-terjadwal={d.id}>
                  <Link
                    href={`/admin/saat-teduh/${d.slug}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition hover:bg-krem-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold text-tinta">
                        {d.title}
                      </span>
                      <span className="block text-[11.5px] text-tinta-3">
                        {formatTanggalID(d.devotion_date)}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-senja/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-jingga">
                      Menunggu
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-5 text-[13px] text-tinta-3">Tidak ada saat teduh terjadwal.</p>
          )}
        </section>
      </div>

      <p className="flex items-center gap-1.5 text-[12px] text-tinta-3">
        <IkonHati className="h-[14px] w-[14px]" />
        {new Intl.NumberFormat("id-ID").format(totalHati)} hati tercatat pada seluruh edisi terbit
        {totalHati === 0 ? " — pengunjung belum menekan hati." : "."}
      </p>
    </div>
  );
}
