"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { formatPrice } from "@/lib/services/plans";
import { formatBytes } from "@/lib/storage-shared";
import type { Plan } from "@/types/database";

export function PlansTable({ plans: initial }: { plans: Plan[] }) {
  const { notify } = useToast();
  const [plans, setPlans] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updatePlan(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Erro ao atualizar plano.", "error");
        return;
      }
      setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.plan } : p)));
      notify("Plano atualizado.", "success");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Armazenamento</th>
            <th className="px-4 py-3 font-medium">Preço mensal</th>
            <th className="px-4 py-3 font-medium">Ativo</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={plan.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{plan.name}</td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  defaultValue={Math.round(plan.storage_limit_bytes / (1024 * 1024 * 1024))}
                  disabled={busyId === plan.id}
                  onBlur={(e) => {
                    const gb = Number(e.target.value);
                    if (gb > 0) updatePlan(plan.id, { storageLimitBytes: gb * 1024 * 1024 * 1024 });
                  }}
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />{" "}
                <span className="text-xs text-slate-400">GB ({formatBytes(plan.storage_limit_bytes)})</span>
              </td>
              <td className="px-4 py-3">
                <input
                  type="number"
                  defaultValue={(plan.price_cents / 100).toFixed(2)}
                  disabled={busyId === plan.id}
                  step="0.01"
                  onBlur={(e) => {
                    const value = Number(e.target.value);
                    if (value >= 0) updatePlan(plan.id, { priceCents: Math.round(value * 100) });
                  }}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />{" "}
                <span className="text-xs text-slate-400">{formatPrice(plan.price_cents, plan.currency)}</span>
              </td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  defaultChecked={plan.active}
                  disabled={busyId === plan.id}
                  onChange={(e) => updatePlan(plan.id, { active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
