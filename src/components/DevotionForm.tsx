"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/dates";

export interface DevotionFormValue {
  id?: string;
  slug: string;
  devotion_date: string;
  title: string;
  summary: string;
  body: string;
  verse_reference: string;
  verse_text: string;
  theme: string;
  author: string;
  featured_image_url: string;
  status?: string;
}

export default function DevotionForm({
  initial,
}: {
  initial?: DevotionFormValue;
}) {
  const router = useRouter();
  const editing = !!initial?.id;

  const [form, setForm] = useState<DevotionFormValue>(
    initial ?? {
      slug: "",
      devotion_date: "",
      title: "",
      summary: "",
      body: "",
      verse_reference: "",
      verse_text: "",
      theme: "",
      author: "",
      featured_image_url: "",
    }
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function set<K extends keyof DevotionFormValue>(k: K, v: DevotionFormValue[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(status: "draft" | "published" | "scheduled", scheduleAt?: string) {
    if (!form.title.trim()) return setError("Judul wajib diisi.");
    if (!form.devotion_date) return setError("Tanggal renungan wajib diisi.");
    if (status === "scheduled" && !scheduleAt)
      return setError("Isi waktu tayang untuk penjadwalan.");

    setBusy(true);
    setError("");
    const supabase = createClient();

    const slug = editing && form.slug ? form.slug : slugify(form.title);
    const payload: Record<string, unknown> = {
      slug,
      devotion_date: form.devotion_date,
      title: form.title.trim(),
      summary: form.summary,
      body: form.body,
      verse_reference: form.verse_reference,
      verse_text: form.verse_text,
      theme: form.theme || null,
      author: form.author || null,
      featured_image_url: form.featured_image_url || null,
      status,
      scheduled_at: status === "scheduled" ? new Date(scheduleAt!).toISOString() : null,
    };
    if (status === "published") payload.published_at = new Date().toISOString();

    let result;
    if (editing) {
      result = await supabase
        .from("devotions")
        .update(payload)
        .eq("id", initial!.id);
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) payload.created_by = user.id;
      result = await supabase.from("devotions").insert(payload);
    }

    setBusy(false);
    if (result.error) {
      const msg = result.error.message;
      if (msg.includes("duplicate key")) {
        if (msg.includes("devotion_date"))
          setError("Tanggal itu sudah dipakai renungan lain — satu tanggal satu renungan.");
        else if (msg.includes("slug"))
          setError("Judul ini sudah dipakai — ubah judul sedikit agar berbeda.");
        else setError(msg);
      } else {
        setError(msg);
      }
      return;
    }
    router.push("/admin/renungan");
    router.refresh();
  }

  const [scheduleAt, setScheduleAt] = useState("");

  const inputCls = "mt-1 w-full rounded border border-slate-300 px-3 py-2.5 text-sm";

  return (
    <form
      onSubmit={(e: FormEvent) => e.preventDefault()}
      className="space-y-4"
    >
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
          <label className="text-sm font-medium">Tanggal renungan *</label>
          <input
            type="date"
            className={inputCls}
            value={form.devotion_date}
            onChange={(e) => set("devotion_date", e.target.value)}
            required
          />
          <p className="mt-1 text-xs text-slate-500">
            Satu tanggal satu renungan — basis data menolak tanggal ganda.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Tema</label>
          <input
            className={inputCls}
            value={form.theme}
            onChange={(e) => set("theme", e.target.value)}
            placeholder="mis. Kasih Karunia"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Penulis</label>
          <input
            className={inputCls}
            value={form.author}
            onChange={(e) => set("author", e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm font-medium">URL gambar sampul (opsional)</label>
          <input
            className={inputCls}
            value={form.featured_image_url}
            onChange={(e) => set("featured_image_url", e.target.value)}
            placeholder="https://..."
          />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Ringkasan (tampil di beranda/arsip)</label>
        <textarea
          className={inputCls}
          rows={2}
          value={form.summary}
          onChange={(e) => set("summary", e.target.value)}
        />
      </div>
      <div>
        <label className="text-sm font-medium">Isi renungan</label>
        <textarea
          className={inputCls}
          rows={12}
          value={form.body}
          onChange={(e) => set("body", e.target.value)}
          placeholder="Paragraf dipisahkan satu baris kosong."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Kutipan Alkitab</label>
          <textarea
            className={inputCls}
            rows={3}
            value={form.verse_text}
            onChange={(e) => set("verse_text", e.target.value)}
            placeholder="Teks ayat (TB)"
          />
          <p className="mt-1 text-xs text-slate-500">
            Kredit “Dikutip dari ALKITAB (TB) © LAI 1974” muncul otomatis.
          </p>
        </div>
        <div>
          <label className="text-sm font-medium">Rujukan</label>
          <input
            className={inputCls}
            value={form.verse_reference}
            onChange={(e) => set("verse_reference", e.target.value)}
            placeholder="mis. Yohanes 3:16"
          />
        </div>
      </div>

      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}

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
          className="rounded-full bg-[#2B4F8F] px-5 py-2.5 text-sm text-white disabled:opacity-60"
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
            className="rounded-full border border-[#2B4F8F] px-4 py-2 text-sm text-[#2B4F8F] disabled:opacity-60"
          >
            Jadwalkan
          </button>
        </div>
      </div>
    </form>
  );
}
