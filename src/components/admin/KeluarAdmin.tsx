"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IkonKeluar } from "@/components/admin/IkonAdmin";

/** Tombol keluar bergaya panel admin (menu sisi kiri). */
export default function KeluarAdmin() {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  return (
    <button
      type="button"
      data-keluar-admin
      disabled={sibuk}
      onClick={async () => {
        setSibuk(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="inline-flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13.5px] font-semibold text-tinta-3 transition hover:bg-merah/5 hover:text-merah disabled:opacity-60"
    >
      <IkonKeluar className="h-[17px] w-[17px]" />
      {sibuk ? "Keluar…" : "Keluar"}
    </button>
  );
}
