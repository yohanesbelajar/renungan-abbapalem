"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Formulir pembuatan grup. Gabung lewat tautan: pengunjung membuka
// /grup/gabung/<token> (lihat halaman gabung/[token]).
export default function AksiGrup() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [pesan, setPesan] = useState("");
  const [sibuk, setSibuk] = useState(false);

  async function buatGrup(e: FormEvent) {
    e.preventDefault();
    setPesan("");
    const judul = nama.trim();
    if (judul.length < 2) {
      setPesan("Nama grup minimal 2 huruf.");
      return;
    }
    setSibuk(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSibuk(false);
      setPesan("Sesi Anda berakhir — silakan masuk lagi.");
      return;
    }
    const { data, error } = await supabase
      .from("communities")
      .insert({ name: judul, created_by: user.id })
      .select("id")
      .single();
    setSibuk(false);
    if (error || !data) {
      setPesan(`Grup gagal dibuat: ${error?.message ?? "tidak ada balasan"}`);
      return;
    }
    setNama("");
    router.push(`/grup/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={buatGrup}
        className="rounded-2xl border border-garis-tipis bg-kertas p-4"
      >
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-plum">
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-full bg-lavender text-[15px] font-semibold text-ungu-2"
          >
            +
          </span>
          Buat grup baru
        </h2>
        <label htmlFor="nama-grup" className="mt-3 block text-[13px] text-tinta-2">
          Nama grup
        </label>
        <input
          id="nama-grup"
          type="text"
          required
          maxLength={60}
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="mis. Kelompok Selasa Palem"
          className="mt-1 w-full rounded-xl border border-garis bg-cream px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={sibuk}
          className="btn btn-utama mt-3 w-full justify-center disabled:opacity-60"
        >
          {sibuk ? "Memproses…" : "Buat grup"}
        </button>
        <p className="mt-3 text-xs text-tinta-3">
          Setelah grup jadi, Anda sebagai pemilik otomatis mendapat tautan
          undangan untuk dibagikan ke teman.
        </p>
      </form>

      {pesan && (
        <p className="mt-4 rounded-xl border border-garis bg-lavender px-4 py-3 text-sm text-tinta">
          {pesan}
        </p>
      )}
    </div>
  );
}
