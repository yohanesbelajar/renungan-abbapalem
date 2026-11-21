import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Halaman tautan undangan: /grup/gabung/<token>
// - belum login → diarahkan ke halaman masuk, sesudah itu otomatis bergabung
// - sudah login → langsung bergabung lalu masuk ke halaman grup
// - token tidak dikenal → pesan, tanpa membocorkan apa pun
export default async function HalamanGabung({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/masuk?next=/grup/gabung/${encodeURIComponent(token)}`);
  }

  const { data, error } = await supabase.rpc("join_community", {
    p_kode: token,
  });

  if (error || !data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-plum">Tautan tidak valid</h1>
        <p className="mt-3 text-tinta-2">
          Tautan undangan ini tidak dikenal. Minta tautan baru kepada admin
          grup.
        </p>
        <Link href="/grup" className="btn btn-sekunder mt-6">
          Kembali ke grup saya
        </Link>
      </div>
    );
  }

  redirect(`/grup/${data}`);
}
