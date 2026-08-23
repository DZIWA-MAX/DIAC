import { createServerSupabaseClient } from "@/lib/supabase/server";
import { PlansTable } from "@/components/admin/PlansTable";
import type { Plan } from "@/types/database";

export default async function AdminPlansPage() {
  const supabase = createServerSupabaseClient();
  const { data: plans } = await supabase.from("plans").select("*").order("sort_order", { ascending: true });

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Planos</h1>
      <p className="mb-6 text-sm text-slate-500">
        Preços e limites de armazenamento configuráveis, refletidos automaticamente em /plans.
      </p>
      <PlansTable plans={(plans ?? []) as Plan[]} />
    </div>
  );
}
