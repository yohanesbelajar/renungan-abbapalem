"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { slugify, todayJakarta } from "@/lib/dates";
import { ringkasanOtomatis, teksPolos } from "@/lib/isi";

// Editor Tiptap hanya di klien, supaya halaman form tetap bisa dirender server.
const BodyEditor = dynamic(() => import("@/components/BodyEditor"), {
  ssr: false,
  loading: () => (
    <div className="rounded border border-slate-300 bg-white p-4 text-sm text-slate-400">
      Memuat editor…
    </div>
  ),
});

export interface DevotionFormValue {
  id?: string;
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  body: string;
  theme: string;
  author: string;
  status?: string;
}

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-11" → "November 2026" */
function labelBulan(bulan: string): string {
  const [th, bl] = bulan.split("-");
  return `${BULAN[parseInt(bl, 10) - 1]} ${th}`;
}

export default function DevotionForm({
  initial,
  temaAwal = "",
  bulanIni,
}: {
  initial?: DevotionFormValue;
  /** Tema bulan yang sedang diisi (dari tabel themes). */
  temaAwal?: string;
  /** Bulan acuan saat menulis baru (YYYY-MM), default bulan berjalan. */
  bulanIni?: string;
}) {
  const router = useRouter();
  const editing = !!initial?.id;

  const [form, setForm] = useState<DevotionFormValue>(
    initial ?? {
      slug: "",
      devotion_date: todayJakarta(),
      title: "",
      summary: "",
      body: "",
      theme: temaAwal,
      author: "",
    }
  );

  // Tema milik bulan, bukan milik satu baris: simpan tema per bulan.
  const bulanTanggal = form.devotion_date
    ? form.devotion_date.slice(0, 7)
    : bulanIni ?? todayJakarta().slice(0, 7);
  const [bulanTema, setBulanTema] = useState<string | null>(null);
  const [tema, setTema] = useState(temaAwal);
  const [temaTersimpan, setTemaTersimpan] = useState(temaAwal);
  const memuatTema = bulanTema !== bulanTanggal;

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [ringkasanManual, setRingkasanManual] = useState(!!initial?.summary);

  const ringkasanOtomatisTeks = useMemo(
    () => ringkasanOtomatis(form.body),
    [form.body]
  );

  function set<K extends keyof DevotionFormValue>(k: K, v: DevotionFormValue[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Ambil tema milik bulan setiap kali bulan tanggal berubah.
  useEffect(() => {
    let batal = false;
    const supabase = createClient();
    supabase
      .from("themes")
      .select("tema")
      .eq("bulan", bulanTanggal)
      .maybeSingle()
      .then(({ data }) => {
        if (batal) return;
        const t = data?.tema ?? "";
        setBulanTema(bulanTanggal);
        setTema(t);
        setTemaTersimpan(t);
      });
    return () => {
      batal = true;
    };
  }, [bulanTanggal]);

  // Tema berubah → tanya sekali, lalu ubah untuk seluruh bulan itu.
  async function simpanTemaBulan() {
    if (tema.trim() === temaTersimpan.trim()) return;
    const pakai = window.confirm(
      `Tema "${tema || "(kosong)"}" akan dipakai untuk SEMUA saat teduh di bulan ${labelBulan(
        bulanTanggal
      )}, termasuk yang sudah terbit. Lanjutkan?`
    );
    if (!pakai) {
      setTema(temaTersimpan);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error: e } = await supabase.rpc("set_theme_bulan", {
      p_bulan: bulanTanggal,
      p_tema: tema,
    });
    setBusy(false);
    if (e) {
      setError(`Gagal menyimpan tema bulan: ${e.message}`);
      return;
    }
    setTemaTersimpan(tema);
    setInfo(`Tema ${labelBulan(bulanTanggal)} diperbarui untuk seluruh bulan.`);
  }

  async function save(status: "draft" | "published" | "scheduled", scheduleAt?: string) {
    if (!form.title.trim()) return setError("Judul wajib diisi.");
    if (!form.devotion_date) return setError("Tanggal saat teduh wajib diisi.");
    if (status === "scheduled" && !scheduleAt)
      return setError("Isi waktu tayang untuk penjadwalan.");

    setBusy(true);
    setError("");
    setInfo("");
    const supabase = createClient();

    // Tema bulan ikut disimpan lebih dulu (satu tema untuk seluruh bulan).
    if (tema.trim() !== temaTersimpan.trim()) {
      const { error: eTema } = await supabase.rpc("set_theme_bulan", {
        p_bulan: bulanTanggal,
        p_tema: tema,
      });
      if (eTema) {
        setBusy(false);
        setError(`Gagal menyimpan tema bulan: ${eTema.message}`);
        return;
      }
      setTemaTersimpan(tema);
    }

    const slug = editing && form.slug ? form.slug : slugify(form.title);
    const ringkasan = form.summary.trim() || ringkasanOtomatis(form.body);
    const payload: Record<string, unknown> = {
      slug,
      devotion_date: form.devotion_date,
      title: form.title.trim(),
      summary: ringkasan,
      body: form.body,
      theme: tema.trim() || null,
      status,
      scheduled_at: status === "scheduled" ? new Date(scheduleAt!).toISOString() : null,
    };
    if (status === "published") payload.published_at = new Date().toISOString();

    let devotionId = initial?.id ?? "";
    let result;
    if (editing) {
      result = await supabase
        .from("devotions")
        .update(payload)
        .eq("id", initial!.id)
        .select("id")
        .single();
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.created_by = user.id;
      result = await supabase.from("devotions").insert(payload).select("id").single();
    }

    if (result.error) {
      setBusy(false);
      const msg = result.error.message;
      if (msg.includes("duplicate key")) {
        if (msg.includes("devotion_date"))
          setError("Tanggal itu sudah dipakai saat teduh lain — satu tanggal satu saat teduh.");
        else if (msg.includes("slug"))
          setError("Judul ini sudah dipakai — ubah judul sedikit agar berbeda.");
        else setError(msg);
      } else {
        setError(msg);
      }
      return;
    }
    devotionId = (result.data as { id: string } | null)?.id ?? devotionId;

    // Nama penulis disimpan di tabel terpisah — hanya admin/editor yang bisa membacanya.
    if (devotionId) {
      if (form.author.trim()) {
        const { error: ePenulis } = await supabase.from("devotion_authors").upsert(
          { devotion_id: devotionId, nama: form.author.trim(), updated_at: new Date().toISOString() },
          { onConflict: "devotion_id" }
        );
        if (ePenulis) {
          setBusy(false);
          setError(`Saat teduh tersimpan, tetapi nama penulis gagal disimpan: ${ePenulis.message}`);
          return;
        }
      } else {
        await supabase.from("devotion_authors").delete().eq("devotion_id", devotionId);
      }
    }

    setBusy(false);
    // Segarkan cache publik (sitemap, halaman topik, ringkasan arsip) supaya
    // edisi yang baru disimpan langsung ikut terdaftar. Kegagalan di sini tidak
    // boleh membatalkan penyimpanan yang sudah berhasil.
    fetch("/api/segar", { method: "POST" }).catch(() => {});
    router.push("/admin/saat-teduh");
    router.refresh();
  }

  const inputCls =
    "mt-1.5 w-full rounded-xl border border-garis bg-kertas px-3 py-2.5 text-[14px] text-tinta outline-none transition placeholder:text-tinta-3/70 focus:border-ungu/50 focus:ring-2 focus:ring-ungu/15";
  const bantu = "mt-1.5 text-[11.5px] leading-relaxed text-tinta-3";
  const labelCls = "text-[12.5px] font-semibold text-tinta-2";

  return (
    <form onSubmit={(e: FormEvent) => e.preventDefault()} className="space-y-4">
      {/* ===== Detail edisi ===== */}
      <section className="rounded-2xl border border-garis-tipis bg-kertas p-4 shadow-[var(--shadow-kartu)]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[14px] font-bold text-plum">Detail edisi</h2>
          {initial?.status && (
            <span className="rounded-full bg-krem-2 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-tinta-2">
              {initial.status}
            </span>
          )}
        </div>

        <div className="mt-3">
          <label className={labelCls} htmlFor="judul-teduh">
            Judul <span className="text-ungu">*</span>
          </label>
          <input
            id="judul-teduh"
            className={`${inputCls} text-[16px] font-semibold`}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Judul saat teduh"
            required
          />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="tanggal-teduh">
              Tanggal <span className="text-ungu">*</span>
            </label>
            <input
              id="tanggal-teduh"
              type="date"
              className={inputCls}
              value={form.devotion_date}
              onChange={(e) => set("devotion_date", e.target.value)}
              required
            />
            <p className={bantu}>Terisi tanggal hari ini. Satu tanggal satu saat teduh.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="tema-teduh">
              Tema {labelBulan(bulanTanggal)}
            </label>
            <input
              id="tema-teduh"
              className={inputCls}
              value={tema}
              onChange={(e) => setTema(e.target.value)}
              onBlur={simpanTemaBulan}
              placeholder="mis. Kasih Karunia"
              disabled={memuatTema}
            />
            <p className={bantu}>
              {memuatTema
                ? "Memuat tema bulan…"
                : temaTersimpan
                  ? `Tema bulan ini: “${temaTersimpan}”. Satu tema untuk seluruh bulan.`
                  : "Belum ada tema bulan ini. Cukup diisi sekali."}
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="penulis-teduh">
              Penulis <span className="font-normal text-tinta-3">(opsional)</span>
            </label>
            <input
              id="penulis-teduh"
              className={inputCls}
              value={form.author}
              onChange={(e) => set("author", e.target.value)}
              placeholder="Nama penulis"
            />
            <p className={bantu}>Hanya terlihat admin &amp; editor, tidak tampil di halaman publik.</p>
          </div>
          <div>
            <label className={labelCls} htmlFor="ringkasan-teduh">
              Ringkasan <span className="font-normal text-tinta-3">(opsional)</span>
            </label>
            <textarea
              id="ringkasan-teduh"
              className={inputCls}
              rows={2}
              value={form.summary}
              onChange={(e) => {
                set("summary", e.target.value);
                setRingkasanManual(e.target.value.trim().length > 0);
              }}
              placeholder={ringkasanOtomatisTeks || "Kosongkan untuk diambil otomatis dari isi"}
            />
            <p className={bantu}>
              Tampil di beranda dan arsip. Bila dikosongkan, diambil otomatis dari beberapa kalimat
              awal isi.
              {!ringkasanManual && ringkasanOtomatisTeks ? (
                <>
                  {" "}
                  Pratinjau: <em>{ringkasanOtomatisTeks}</em>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      {/* ===== Isi ===== */}
      <section className="rounded-2xl border border-garis-tipis bg-kertas p-4 shadow-[var(--shadow-kartu)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[14px] font-bold text-plum">Isi saat teduh</h2>
          <p className="text-[11px] tabular-nums text-tinta-3">
            {teksPolos(form.body).length.toLocaleString("id-ID")} karakter
          </p>
        </div>
        <div className="mt-2.5">
          <BodyEditor value={form.body} onChange={(html) => set("body", html)} />
        </div>
        <p className={bantu}>
          Semua rujukan ayat di dalam isi otomatis menjadi tautan yang membuka ayat Alkitab.
        </p>
      </section>

      {error && (
        <p className="rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-[13px] font-medium text-merah">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-xl border border-baca-ya bg-baca-ya/40 px-4 py-3 text-[13px] font-medium text-[#1f6b48]">
          {info}
        </p>
      )}

      {/* ===== Aksi ===== */}
      <section className="rounded-2xl border border-garis-tipis bg-krem-2/60 p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => save("published")}
            className="btn btn-utama btn-sm"
          >
            {busy ? "Menyimpan…" : "Terbitkan sekarang"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => save("draft")}
            className="btn btn-sekunder btn-sm"
          >
            Simpan draft
          </button>
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-garis sm:block" />
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className="rounded-xl border border-garis bg-kertas px-2.5 py-2 text-[13px] text-tinta outline-none focus:border-ungu/50"
              value={scheduleAt}
              onChange={(e) => setScheduleAt(e.target.value)}
              aria-label="Waktu tayang"
            />
            <button
              type="button"
              disabled={busy}
              onClick={() => save("scheduled", scheduleAt)}
              className="btn btn-halus btn-sm"
            >
              Jadwalkan
            </button>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-tinta-3">
          Terbit = langsung tampil. Draft = hanya terlihat staf. Jadwalkan = tayang otomatis pada
          waktu yang dipilih.
        </p>
      </section>
    </form>
  );
}
