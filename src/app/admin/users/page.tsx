import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UsersTable } from "@/components/admin/UsersTable";
import type { Plan, Profile } from "@/types/database";

export default async function AdminUsersPage() {
  const supabase = createServerSupabaseClient();

  const [{ data: profiles }, { data: plans }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("plans").select("*").order("sort_order", { ascending: true }),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Usuários</h1>
      <UsersTable profiles={(profiles ?? []) as Profile[]} plans={(plans ?? []) as Plan[]} />
    </div>
  );
}
