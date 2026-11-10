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
    router.push("/admin/saat-teduh");
    router.refresh();
  }

  const inputCls = "mt-1 w-full rounded border border-slate-300 px-3 py-2.5 text-sm";
  const bantu = "mt-1 text-xs text-slate-500";

  return (
    <form onSubmit={(e: FormEvent) => e.preventDefault()} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Judul *</label>
        <input
          className={inputCls}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Tanggal saat teduh *</label>
          <input
            type="date"
            className={inputCls}
            value={form.devotion_date}
            onChange={(e) => set("devotion_date", e.target.value)}
            required
          />
          <p className={bantu}>
            Otomatis terisi tanggal hari ini. Satu tanggal satu saat teduh.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">
            Tema {labelBulan(bulanTanggal)} — satu tema untuk seluruh bulan
          </label>
          <input
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
                ? `Tema bulan ini: “${temaTersimpan}”. Mengubahnya mengubah seluruh bulan.`
                : "Belum ada tema untuk bulan ini. Cukup diisi sekali."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Penulis (opsional)</label>
          <input
            className={inputCls}
            value={form.author}
            onChange={(e) => set("author", e.target.value)}
            placeholder="Nama penulis"
          />
          <p className={bantu}>
            Opsional. Nama penulis hanya terlihat oleh admin dan editor, tidak tampil di
            halaman publik.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Ringkasan (opsional)</label>
          <textarea
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
            Opsional. Tampil di beranda dan arsip. Bila dikosongkan, diambil otomatis dari
            beberapa kalimat awal isi.
            {!ringkasanManual && ringkasanOtomatisTeks ? (
              <>
                {" "}
                Pratinjau otomatis: <em>{ringkasanOtomatisTeks}</em>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Isi saat teduh</label>
        <div className="mt-1">
          <BodyEditor value={form.body} onChange={(html) => set("body", html)} />
        </div>
        <p className={bantu}>
          {teksPolos(form.body).length} karakter · semua rujukan ayat di dalam isi menjadi
          tautan yang membuka ayat Alkitab.
        </p>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {info && <p className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{info}</p>}

      <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => save("draft")}
          className="rounded-full border border-slate-400 px-5 py-2.5 text-sm disabled:opacity-60"
        >
          Simpan Draft
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => save("published")}
          className="rounded-full bg-[#9B3F76] px-5 py-2.5 text-sm text-white disabled:opacity-60"
        >
          Terbitkan Sekarang
        </button>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            className="rounded border border-slate-300 px-2 py-2 text-sm"
            value={scheduleAt}
            onChange={(e) => setScheduleAt(e.target.value)}
            aria-label="Waktu tayang"
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => save("scheduled", scheduleAt)}
            className="rounded-full border border-[#9B3F76] px-4 py-2 text-sm text-[#9B3F76] disabled:opacity-60"
          >
            Jadwalkan
          </button>
        </div>
      </div>
    </form>
  );
}
