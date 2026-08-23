"use client";

import { useState } from "react";
import { ShieldBan, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/storage-shared";
import type { Plan, Profile } from "@/types/database";

export function UsersTable({ profiles: initial, plans }: { profiles: Profile[]; plans: Plan[] }) {
  const { notify } = useToast();
  const [profiles, setProfiles] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateUser(id: string, body: Record<string, unknown>) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Erro ao atualizar usuário.", "error");
        return;
      }
      setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...data.profile } : p)));
      notify("Usuário atualizado.", "success");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-slate-100 text-xs text-slate-400">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Plano</th>
            <th className="px-4 py-3 font-medium">Cota</th>
            <th className="px-4 py-3 font-medium">Cargo</th>
            <th className="px-4 py-3 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr key={profile.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{profile.name || "—"}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    profile.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}
                >
                  {profile.status === "active" ? "Ativo" : "Bloqueado"}
                </span>
              </td>
              <td className="px-4 py-3">
                <select
                  defaultValue={profile.plan_id ?? ""}
                  disabled={busyId === profile.id}
                  onChange={(e) => updateUser(profile.id, { planId: e.target.value })}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-slate-500">{formatBytes(profile.storage_quota_bytes)}</td>
              <td className="px-4 py-3 text-slate-500">{profile.role}</td>
              <td className="px-4 py-3">
                {profile.status === "active" ? (
                  <button
                    disabled={busyId === profile.id || profile.role === "admin"}
                    onClick={() => updateUser(profile.id, { status: "blocked" })}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <ShieldBan className="h-3.5 w-3.5" /> Bloquear
                  </button>
                ) : (
                  <button
                    disabled={busyId === profile.id}
                    onClick={() => updateUser(profile.id, { status: "active" })}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Desbloquear
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
