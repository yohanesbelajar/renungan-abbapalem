"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Keluar dari grup. Pemilik yang keluar otomatis digantikan anggota
// terlama (aturan ada di database); kalau anggota terakhir — grup ikut
// hilang. Anggota lain tetap melihat grup.
export default function TinggalkanGrup({
  grupId,
  namaGrup,
}: {
  grupId: string;
  namaGrup: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  async function keluar() {
    const yakin = window.confirm(
      `Keluar dari grup "${namaGrup}"? Progres Anda tidak akan terlihat di grup ini lagi.`
    );
    if (!yakin) return;
    setSibuk(true);
    setPesan("");
    const { error } = await supabase
      .from("community_members")
      .delete()
      .eq("community_id", grupId);
    setSibuk(false);
    if (error) {
      setPesan(`Gagal keluar: ${error.message}`);
      return;
    }
    router.push("/komunitas");
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={keluar}
        disabled={sibuk}
        className="btn btn-halus text-merah disabled:opacity-60"
      >
        {sibuk ? "Memproses…" : "Keluar dari grup"}
      </button>
      {pesan && <p className="mt-2 text-sm text-merah">{pesan}</p>}
    </div>
  );
}
