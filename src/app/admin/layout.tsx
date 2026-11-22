import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KeluarAdmin from "@/components/admin/KeluarAdmin";
import NavigasiAdmin, { TautanLuar } from "@/components/admin/NavigasiAdmin";

export const dynamic = "force-dynamic";

const LABEL_PERAN: Record<string, string> = {
  superadmin: "Super admin",
  admin: "Admin",
  editor: "Editor",
};

function inisial(nama: string): string {
  const bagian = nama.trim().split(/\s+/).filter(Boolean);
  if (!bagian.length) return "?";
  return (bagian[0][0] + (bagian.length > 1 ? bagian[bagian.length - 1][0] : "")).toUpperCase();
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/masuk?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "editor" && profile?.role !== "superadmin") {
    redirect("/");
  }

  const nama = profile?.display_name || user.email || "Staf";
  const peran = profile?.role ?? "editor";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* ===== Kepala panel ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(160deg,#963296,#6b2a55)] text-[15px] font-bold text-white shadow-[0_6px_16px_-8px_rgba(74,35,82,0.9)]"
          >
            ST
          </span>
          <div>
            <p className="text-[15px] font-bold leading-tight text-plum">Panel Admin</p>
            <p className="text-[11.5px] leading-tight text-tinta-3">Saat Teduh · Abbalove Palem</p>
          </div>
        </div>
        <TautanLuar />
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* ===== Sisi kiri: identitas + menu ===== */}
        <aside className="lg:w-[218px] lg:shrink-0">
          <div className="rounded-2xl border border-garis-tipis bg-kertas p-3 shadow-[var(--shadow-kartu)] lg:sticky lg:top-5">
            <div className="flex items-center gap-2.5 rounded-xl bg-krem-2 px-2.5 py-2.5">
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lavender text-[12.5px] font-bold text-ungu"
              >
                {inisial(nama)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-tinta">{nama}</p>
                <p className="truncate text-[11px] text-tinta-3">
                  {LABEL_PERAN[peran] ?? peran}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <NavigasiAdmin peran={peran} />
            </div>

            <div className="mt-3 border-t border-garis-tipis pt-3">
              <KeluarAdmin />
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </div>
  );
}
