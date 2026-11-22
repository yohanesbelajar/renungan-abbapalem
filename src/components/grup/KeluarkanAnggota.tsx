"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Tombol keluarkan anggota dari grup — hanya muncul untuk pemilik/admin grup.
// Aturan siapa boleh mengeluarkan siapa ditegakkan di database
// (fungsi keluarkan_anggota), bukan hanya dengan menyembunyikan tombol.
export default function KeluarkanAnggota({
  grupId,
  userId,
  nama,
  peran,
  peranSaya,
}: {
  grupId: string;
  userId: string;
  nama: string;
  peran: string;
  peranSaya: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  // Pemilik tidak bisa dikeluarkan; admin hanya boleh mengeluarkan anggota.
  const boleh =
    peran !== "owner" && (peranSaya === "owner" || (peranSaya === "admin" && peran === "member"));
  if (!boleh) return null;

  async function keluarkan() {
    const yakin = window.confirm(
      `Keluarkan ${nama} dari grup ini?\n\nOrang ini tidak lagi melihat papan grup dan progresnya ` +
        `tidak lagi tampil di sini. Catatan bacaannya tetap tersimpan di akunnya sendiri, dan ` +
        `ia bisa masuk lagi lewat tautan undangan.`
    );
    if (!yakin) return;
    setSibuk(true);
    setPesan("");
    const { error } = await supabase.rpc("keluarkan_anggota", {
      p_grup: grupId,
      p_user: userId,
    });
    setSibuk(false);
    if (error) {
      setPesan(error.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        data-keluarkan={userId}
        onClick={keluarkan}
        disabled={sibuk}
        className="text-[11.5px] font-semibold text-merah hover:underline disabled:opacity-60"
      >
        {sibuk ? "Mengeluarkan…" : "Keluarkan"}
      </button>
      {pesan && <span className="mt-0.5 max-w-[200px] text-right text-[11px] text-merah">{pesan}</span>}
    </span>
  );
}
