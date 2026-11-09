"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("not confirmed")) {
        setError(
          "Email Anda belum diverifikasi. Cek kotak masuk untuk tautan verifikasi."
        );
      } else {
        setError("Email atau kata sandi salah, atau akun belum terdaftar.");
      }
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Masuk</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Kata sandi
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="text-sm text-green-700">{info}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#2B4F8F] py-3 text-white disabled:opacity-60"
        >
          {busy ? "Memproses..." : "Masuk"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Belum punya akun?{" "}
        <Link href="/daftar" className="text-[#2B4F8F] hover:underline">
          Daftar
        </Link>
      </p>
      <div className="mt-6 text-center text-sm">
        <button
          onClick={async () => {
            if (!email) {
              setError("Isi email Anda dulu, lalu klik lupa kata sandi.");
              return;
            }
            const { error } = await supabase.auth.resetPasswordForEmail(email);
            if (error) setError(error.message);
            else setInfo("Tautan reset kata sandi telah dikirim ke email Anda.");
          }}
          className="text-slate-500 hover:text-[#2B4F8F] hover:underline"
        >
          Lupa kata sandi?
        </button>
      </div>
    </div>
  );
}
