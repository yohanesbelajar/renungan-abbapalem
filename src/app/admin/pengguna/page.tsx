import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KelolaPengguna, { type BarisPengguna } from "@/components/KelolaPengguna";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk?next=/admin/pengguna");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const peran = me?.role ?? "member";
  const superadmin = peran === "superadmin";
  const boleh = peran === "admin" || superadmin;
  if (!boleh) redirect("/");

  const { data, error } = await supabase.rpc("daftar_pengguna");
  const baris = ((data ?? []) as BarisPengguna[]).filter((u) => u.id);
  const aktif = baris.filter((u) => u.status !== "ditendang").length;
  const ditendang = baris.length - aktif;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Pengguna</h1>
      <p className="mt-1 text-sm text-slate-500">
        Semua akun yang terdaftar di situs. Ubah peran, tendang (login diblokir, data utuh, bisa
        dipulihkan), atau hapus permanen
        {superadmin ? "" : " — hapus permanen hanya oleh super admin"}.
      </p>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-lavender px-3 py-1 font-semibold text-plum">
          {baris.length} akun
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{aktif} aktif</span>
        <span className="rounded-full bg-merah/10 px-3 py-1 font-semibold text-merah">
          {ditendang} ditendang
        </span>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat pengguna: {error.message}
        </p>
      )}

      {baris.length > 0 ? (
        <KelolaPengguna baris={baris} sayaId={user.id} sayaPeran={peran} />
      ) : (
        !error && <p className="mt-6 text-sm text-slate-500">Belum ada pengguna terdaftar.</p>
      )}

      <p className="mt-4 text-[11.5px] leading-relaxed text-slate-400">
        Tendang memblokir login dan memutus sesi yang sedang berjalan; akun tetap ada dan bisa
        dipulihkan. Hapus permanen membuang akun beserta profil, keanggotaan grup, favorit, dan
        catatan bacaan — tidak bisa dikembalikan. Akun yang masih pemilik grup beranggota lain atau
        pernah menulis saat teduh ditolak oleh sistem.
      </p>
    </div>
  );
}
