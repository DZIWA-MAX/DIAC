import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/services/plans";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  refunded: "bg-slate-100 text-slate-600",
};

export default async function AdminPaymentsPage() {
  const supabase = createServerSupabaseClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Pagamentos</h1>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Provedor</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {(payments ?? []).map((payment) => (
              <tr key={payment.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {formatPrice(payment.amount_cents, payment.currency)}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{payment.provider ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(payment.created_at).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {(payments ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum pagamento registrado. A integração com um gateway (Stripe/Mercado Pago) ainda não está
                  conectada — veja <code>.env.example</code>.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
