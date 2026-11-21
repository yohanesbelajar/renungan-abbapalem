"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Mengangkat/menurunkan peran anggota — hanya pemilik grup yang boleh.
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
  const [sibuk, setSibuk] = useState(false);
  const [pesan, setPesan] = useState("");

  const jadiAdmin = peranSekarang !== "admin";
  const label = sibuk
    ? "Memproses…"
    : jadiAdmin
      ? "Jadikan admin"
      : "Jadikan anggota";

  async function ubah() {
    setSibuk(true);
    setPesan("");
    const { error } = await supabase
      .from("community_members")
      .update({ role: jadiAdmin ? "admin" : "member" })
      .eq("community_id", grupId)
      .eq("user_id", userId);
    setSibuk(false);
    if (error) {
      setPesan(`Gagal: ${error.message}`);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={ubah}
        disabled={sibuk}
        className="text-xs font-medium text-ungu hover:underline disabled:opacity-60"
      >
        {label}
      </button>
      {pesan && <span className="text-[11px] text-merah">{pesan}</span>}
    </span>
  );
}
