"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import GoogleButton from "@/components/GoogleButton";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [community, setCommunity] = useState("Abbalove Palem");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, church_community: community },
        emailRedirectTo: `${window.location.origin}/masuk`,
      },
    });
    setBusy(false);
    if (error) {
      if (
        error.message.toLowerCase().includes("already") ||
        error.message.toLowerCase().includes("registered")
      ) {
        setError("Email ini sudah terdaftar. Silakan masuk atau reset kata sandi.");
      } else {
        setError(error.message);
      }
      return;
    }
    if (data.session) {
      // Verifikasi tidak diwajibkan di project ini — langsung masuk
      router.push("/");
      router.refresh();
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Cek email Anda</h1>
        <p className="mt-4 text-slate-600">
          Tautan verifikasi telah dikirim ke <strong>{email}</strong>. Klik
          tautan tersebut untuk mengaktifkan akun Anda, lalu masuk.
        </p>
        <p className="mt-4 text-sm text-slate-500">
          Tidak menerima email? Periksa folder spam, atau{" "}
          <button
            className="text-[#9B3F76] underline"
            onClick={async () => {
              const { error } = await supabase.auth.resend({
                type: "signup",
                email,
                options: { emailRedirectTo: `${window.location.origin}/masuk` },
              });
              if (error) setError(error.message);
            }}
          >
            kirim ulang
          </button>
          .
        </p>
        <Link href="/masuk" className="mt-6 inline-block text-[#9B3F76] hover:underline">
          Ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Daftar</h1>
      <p className="mt-1 text-sm text-slate-500">
        Buat akun untuk memberi heart dan menandai saat teduh selesai.
      </p>
      <div className="mt-6">
        <GoogleButton next="/profil" />
        <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          atau dengan email
          <span className="h-px flex-1 bg-slate-200" />
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="text-sm font-medium">
            Nama lengkap
          </label>
          <input
            id="name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3"
          />
        </div>
        <div>
          <label htmlFor="community" className="text-sm font-medium">
            Gereja / komunitas
          </label>
          <input
            id="community"
            type="text"
            required
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3"
          />
        </div>
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
            Kata sandi (minimal 8 karakter)
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-3"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[#9B3F76] py-3 text-white disabled:opacity-60"
        >
          {busy ? "Memproses..." : "Daftar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="text-[#9B3F76] hover:underline">
          Masuk
        </Link>
      </p>
    </div>
  );
}
