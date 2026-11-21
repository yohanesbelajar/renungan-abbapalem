"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mengubah peran anggota lewat combo drop-down (panah) — hanya pemilik grup
// yang boleh; kebijakan RLS sudah membatasi ke pemilik dan menolak ubah diri
// sendiri. Pilihan disengaja hanya Anggota/Admin: kekuasaan pemilik tidak
// ditawarkan di sini supaya tidak bisa berpindah tanpa sengaja (kepemilikan
// berganti otomatis saat pemilik keluar).
export default function UbahPeran({
  grupId,
  userId,
  peranSekarang,
}: {
  grupId: string;
  userId: string;
  peranSekarang: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [nilai, setNilai] = useState(peranSekarang);
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  async function ubah(v: string) {
    if (v === peranSekarang || sibuk) return;
    const lama = nilai;
    setNilai(v);
    setSibuk(true);
    setPesan("");
    const { error } = await supabase
      .from("community_members")
      .update({ role: v })
      .eq("community_id", grupId)
      .eq("user_id", userId);
    setSibuk(false);
    if (error) {
      setNilai(lama);
      setPesan("Gagal menyimpan");
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <select
        data-ubah-peran={userId}
        value={nilai}
        disabled={sibuk}
        onChange={(e) => ubah(e.target.value)}
        aria-label="Ubah peran anggota"
        className="rounded border border-garis bg-kertas px-1.5 py-1 text-xs text-tinta-2 disabled:opacity-60"
      >
        <option value="member">Anggota</option>
        <option value="admin">Admin</option>
        {nilai === "owner" && <option value="owner">Pemilik</option>}
      </select>
      {pesan && <span className="text-[11px] text-merah">{pesan}</span>}
    </span>
  );
}
