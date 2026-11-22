import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KelolaPengguna, { type BarisPengguna } from "@/components/KelolaPengguna";
import Kepala, { KotakAngka } from "@/components/admin/Kepala";
import { IkonOrang } from "@/components/admin/IkonAdmin";
import { IkonCentang } from "@/components/admin/IkonAdmin";

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
  const staf = baris.filter((u) => ["admin", "superadmin", "editor"].includes(u.peran)).length;

  return (
    <div className="space-y-4">
      <Kepala
        label="Akun"
        judul="Pengguna"
        keterangan="Semua akun terdaftar. Ubah peran, blokir login dengan Tendang (data utuh, bisa dipulihkan), atau hapus permanen bila benar-benar perlu."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KotakAngka label="Total akun" nilai={baris.length} Ikon={IkonOrang} nada="ungu" />
        <KotakAngka label="Aktif" nilai={aktif} Ikon={IkonCentang} nada="hijau" />
        <KotakAngka label="Staf" nilai={staf} nada="netral" />
        <KotakAngka label="Ditendang" nilai={ditendang} nada="senja" />
      </div>

      {error && (
        <p className="rounded-xl border border-merah/30 bg-merah/5 px-4 py-3 text-sm text-merah">
          Gagal memuat pengguna: {error.message}
        </p>
      )}

      {baris.length > 0 ? (
        <KelolaPengguna baris={baris} sayaId={user.id} sayaPeran={peran} />
      ) : (
        !error && (
          <p className="rounded-2xl border border-garis-tipis bg-kertas px-4 py-8 text-center text-[13.5px] text-tinta-2">
            Belum ada pengguna terdaftar.
          </p>
        )
      )}

      <p className="rounded-xl bg-krem-2/70 px-3.5 py-3 text-[11.5px] leading-relaxed text-tinta-3">
        Tendang memblokir login dan memutus sesi yang sedang berjalan; akun tetap ada dan bisa
        dipulihkan. Hapus permanen membuang akun beserta profil, keanggotaan grup, favorit, dan
        catatan bacaan — tidak bisa dikembalikan. Akun yang masih pemilik grup beranggota lain atau
        pernah menulis saat teduh ditolak oleh sistem.
        {superadmin ? "" : " Hapus permanen hanya tersedia untuk super admin."}
      </p>
    </div>
  );
}
