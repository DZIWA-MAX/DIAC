import { createServerSupabaseClient } from "@/lib/supabase/server";

const STATUS_LABELS: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  expired: "Expirada",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  trialing: "bg-brand-50 text-brand-700",
  past_due: "bg-amber-50 text-amber-700",
  canceled: "bg-slate-100 text-slate-600",
  expired: "bg-red-50 text-red-700",
};

export default async function AdminSubscriptionsPage() {
  const supabase = createServerSupabaseClient();
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*, plans ( name )")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Assinaturas</h1>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Início</th>
              <th className="px-4 py-3 font-medium">Próxima cobrança</th>
            </tr>
          </thead>
          <tbody>
            {(subscriptions ?? []).map((sub: any) => (
              <tr key={sub.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{sub.plans?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[sub.status]}`}>
                    {STATUS_LABELS[sub.status] ?? sub.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{new Date(sub.started_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-slate-500">
                  {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
            {(subscriptions ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nenhuma assinatura ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
