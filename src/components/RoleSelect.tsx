"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RoleSelect({
  userId,
  role,
  canSuper = false,
}: {
  userId: string;
  role: string;
  canSuper?: boolean;
}) {
  const [value, setValue] = useState(role);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  // Baris super admin hanya bisa diubah oleh super admin lain.
  const terkunci = role === "superadmin" && !canSuper;

  async function change(newRole: string) {
    const lama = value;
    setValue(newRole);
    setState("saving");
    const supabase = createClient();
    // Update langsung pada baris user lain: diblokir RLS profil_ubah_sendiri.
    // Gunakan RPC yang dibuat khusus (lihat pengaturan Supabase: set_user_role).
    const { error } = await supabase.rpc("set_user_role", {
      target_user: userId,
      new_role: newRole,
    });
    if (error) {
      setValue(lama);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
      return;
    }
    setState("saved");
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <span className="flex items-center gap-2">
      <select
        value={value}
        disabled={state === "saving" || terkunci}
        onChange={(e) => change(e.target.value)}
        className="rounded border border-slate-300 bg-cream px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Peran pengguna"
      >
        <option value="member">Anggota</option>
        <option value="editor">Editor</option>
        <option value="admin">Admin</option>
        <option value="superadmin">Super Admin</option>
      </select>
      {state === "saving" && <span className="text-xs text-slate-400">menyimpan…</span>}
      {state === "saved" && <span className="text-xs text-green-600">tersimpan</span>}
      {state === "error" && (
        <span className="text-xs text-red-600">gagal — izin ditolak</span>
      )}
      {terkunci && <span className="text-xs text-slate-400">terkunci</span>}
    </span>
  );
}
