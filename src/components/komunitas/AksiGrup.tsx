"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Formulir pembuatan grup dan gabung pakai kode undangan.
export default function AksiGrup() {
  const router = useRouter();
  const supabase = createClient();

  const [nama, setNama] = useState("");
  const [kode, setKode] = useState("");
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
    router.push(`/komunitas/${data.id}`);
    router.refresh();
  }

  async function gabung(e: FormEvent) {
    e.preventDefault();
    setPesan("");
    const k = kode.trim().toUpperCase();
    if (!k) {
      setPesan("Isi kode undangan dulu.");
      return;
    }
    setSibuk(true);
    const { data, error } = await supabase.rpc("join_community", {
      p_kode: k,
    });
    setSibuk(false);
    if (error) {
      setPesan(`Gagal bergabung: ${error.message}`);
      return;
    }
    if (!data) {
      setPesan("Kode itu tidak ditemukan. Periksa lagi hurufnya.");
      return;
    }
    setKode("");
    router.push(`/komunitas/${data}`);
    router.refresh();
  }

  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <form
        onSubmit={buatGrup}
        className="rounded-2xl border border-garis-tipis bg-kertas p-4"
      >
        <h2 className="font-semibold text-plum">Buat grup baru</h2>
        <label htmlFor="nama-grup" className="mt-3 block text-sm text-tinta-2">
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
          className="mt-1 w-full rounded border border-garis bg-cream px-3 py-2.5 text-sm"
        />
        <button
          type="submit"
          disabled={sibuk}
          className="btn btn-utama mt-3 w-full justify-center disabled:opacity-60"
        >
          {sibuk ? "Memproses…" : "Buat grup"}
        </button>
      </form>

      <form
        onSubmit={gabung}
        className="rounded-2xl border border-garis-tipis bg-kertas p-4"
      >
        <h2 className="font-semibold text-plum">Gabung dengan kode</h2>
        <label htmlFor="kode-undang" className="mt-3 block text-sm text-tinta-2">
          Kode undangan
        </label>
        <input
          id="kode-undang"
          type="text"
          required
          maxLength={12}
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          placeholder="mis. K4M7P2Q9"
          className="mt-1 w-full rounded border border-garis bg-cream px-3 py-2.5 font-mono uppercase tracking-widest"
        />
        <button
          type="submit"
          disabled={sibuk}
          className="btn btn-sekunder mt-3 w-full justify-center disabled:opacity-60"
        >
          {sibuk ? "Memproses…" : "Gabung"}
        </button>
      </form>

      {pesan && (
        <p className="sm:col-span-2 rounded-xl border border-garis bg-lavender px-4 py-3 text-sm text-tinta">
          {pesan}
        </p>
      )}
    </div>
  );
}
