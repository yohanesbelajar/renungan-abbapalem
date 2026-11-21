"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

// Pembuat nama unik (username) di profil.
// Aturan: 2–12 karakter, huruf kecil/angka/garis bawah, tanpa spasi, unik.
export default function AturUsername({ awal }: { awal: string }) {
  const supabase = createClient();
  const [nilai, setNilai] = useState(awal);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");
  const [sukses, setSukses] = useState(false);

  useEffect(() => setNilai(awal), [awal]);

  async function simpan(e: FormEvent) {
    e.preventDefault();
    setSukses(false);
    const bersih = nilai.trim().toLowerCase();
    if (!/^[a-z0-9_]+$/.test(bersih)) {
      setPesan("Hanya huruf kecil, angka, atau garis bawah — tanpa spasi.");
      return;
    }
    if (bersih.length < 2 || bersih.length > 12) {
      setPesan("Panjangnya harus 2–12 karakter.");
      return;
    }
    setSibuk(true);
    setPesan("");
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSibuk(false);
      setPesan("Sesi berakhir — silakan masuk lagi.");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ username: bersih })
      .eq("id", user.id);
    setSibuk(false);
    if (error) {
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        setPesan("Nama itu sudah dipakai orang lain — coba yang lain.");
      } else {
        setPesan(`Gagal menyimpan: ${error.message}`);
      }
      return;
    }
    setNilai(bersih);
    setSukses(true);
    setPesan("Tersimpan. Nama inilah yang tampil di grup.");
  }

  return (
    <form
      onSubmit={simpan}
      className="mt-6 rounded-2xl border border-garis-tipis bg-kertas p-4"
    >
      <h2 className="font-semibold text-plum">Nama unik</h2>
      <p className="mt-1 text-sm text-tinta-2">
        Tampil di grup sebagai pengganti alamat email. 2–12 karakter, tanpa
        spasi, hanya huruf kecil/angka/garis bawah, dan tidak boleh sama dengan
        orang lain.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          id="nama-unik"
          type="text"
          value={nilai}
          onChange={(e) => {
            setNilai(e.target.value.toLowerCase());
            setSukses(false);
          }}
          maxLength={12}
          placeholder="mis. johanes"
          autoComplete="off"
          className="min-w-0 flex-1 rounded border border-garis bg-cream px-3 py-2.5 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={sibuk}
          className="btn btn-utama disabled:opacity-60"
        >
          {sibuk ? "Menyimpan…" : "Simpan nama"}
        </button>
      </div>
      {pesan && (
        <p
          className={
            sukses
              ? "mt-2 text-sm text-[#1e7a44]"
              : "mt-2 text-sm text-merah"
          }
        >
          {pesan}
        </p>
      )}
    </form>
  );
}
