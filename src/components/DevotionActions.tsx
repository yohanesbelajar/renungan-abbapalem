"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function DevotionActions({
  devotionId,
  heartsCount: initialCount,
  initialHearted,
  initialCompleted,
  loggedIn,
}: {
  devotionId: string;
  heartsCount: number;
  initialHearted: boolean;
  initialCompleted: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [count, setCount] = useState(initialCount);
  const [hearted, setHearted] = useState(initialHearted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  function requireLogin() {
    router.push(`/masuk?next=${encodeURIComponent(window.location.pathname)}`);
  }

  async function toggleHeart() {
    if (!loggedIn) return requireLogin();
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return requireLogin(); }
    if (hearted) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("devotion_id", devotionId);
      if (!error) { setHearted(false); setCount((c) => c - 1); }
    } else {
      const { error } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, devotion_id: devotionId });
      if (!error) { setHearted(true); setCount((c) => c + 1); }
    }
    setBusy(false);
  }

  async function toggleCompleted() {
    if (!loggedIn) return requireLogin();
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setBusy(false); return requireLogin(); }
    if (completed) {
      const { error } = await supabase
        .from("reading_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("devotion_id", devotionId);
      if (!error) setCompleted(false);
    } else {
      const { error } = await supabase
        .from("reading_progress")
        .insert({ user_id: user.id, devotion_id: devotionId });
      if (!error) setCompleted(true);
    }
    setBusy(false);
  }

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url, title: document.title }); return; } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <button
        onClick={toggleHeart}
        disabled={busy}
        aria-pressed={hearted}
        className={`flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
          hearted
            ? "border-red-400 bg-red-50 text-red-600"
            : "border-slate-300 text-slate-700 hover:border-red-300"
        }`}
      >
        <span aria-hidden>♥</span>
        <span>{hearted ? "Batalkan heart" : "Berikan heart"}</span>
        <span className="text-xs">({count})</span>
      </button>

      <button
        onClick={toggleCompleted}
        disabled={busy}
        aria-pressed={completed}
        className={`flex min-h-11 items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
          completed
            ? "border-green-500 bg-green-50 text-green-700"
            : "border-slate-300 text-slate-700 hover:border-green-400"
        }`}
      >
        <span aria-hidden>✓</span>
        <span>{completed ? "Selesai dibaca" : "Tandai selesai membaca"}</span>
      </button>

      <button
        onClick={share}
        className="flex min-h-11 items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:border-[#A1177C]"
      >
        <span aria-hidden>↗</span>
        <span>{copied ? "Tautan tersalin!" : "Bagikan"}</span>
      </button>
    </div>
  );
}
