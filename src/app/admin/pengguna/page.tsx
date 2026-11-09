import { createClient } from "@/lib/supabase/server";
import RoleSelect from "@/components/RoleSelect";


export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .order("created_at")
    .limit(200);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">Pengguna</h1>
      <p className="mt-1 text-sm text-slate-500">
        Ubah peran pengguna: anggota, editor, atau admin.
      </p>
      {users && users.length > 0 ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs text-slate-500">
            <tr>
              <th className="py-2">Nama</th>
              <th className="py-2">Email</th>
              <th className="py-2">Peran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-2">{u.display_name}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">
                  <RoleSelect userId={u.id} role={u.role} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-6 text-sm text-slate-500">Belum ada pengguna terdaftar.</p>
      )}
    </div>
  );
}
