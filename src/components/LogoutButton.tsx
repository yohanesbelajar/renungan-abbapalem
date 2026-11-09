"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="rounded-full border border-slate-300 px-4 py-2 text-sm hover:border-red-400 hover:text-red-600"
    >
      Keluar
    </button>
  );
}
