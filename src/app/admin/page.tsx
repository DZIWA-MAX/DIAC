import { Users, UserCheck, UserX, HardDrive, Files, CreditCard, DollarSign } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/services/storage";
import { formatPrice } from "@/lib/services/plans";
import { Card } from "@/components/ui/Card";

interface Stats {
  total_users: number;
  active_users: number;
  blocked_users: number;
  total_files: number;
  total_storage_bytes: number;
  active_subscriptions: number;
  monthly_revenue_cents: number;
}

export default async function AdminDashboardPage() {
  const supabase = createServerSupabaseClient();

  const { data } = await supabase.rpc("admin_get_platform_stats").single<Stats>();
  const stats = data ?? {
    total_users: 0,
    active_users: 0,
    blocked_users: 0,
    total_files: 0,
    total_storage_bytes: 0,
    active_subscriptions: 0,
    monthly_revenue_cents: 0,
  };

  const cards = [
    { label: "Total de usuários", value: stats.total_users, icon: Users, color: "bg-brand-50 text-brand-600" },
    { label: "Usuários ativos", value: stats.active_users, icon: UserCheck, color: "bg-emerald-50 text-emerald-600" },
    { label: "Usuários bloqueados", value: stats.blocked_users, icon: UserX, color: "bg-red-50 text-red-600" },
    { label: "Armazenamento total", value: formatBytes(stats.total_storage_bytes), icon: HardDrive, color: "bg-violet-50 text-violet-600" },
    { label: "Arquivos armazenados", value: stats.total_files, icon: Files, color: "bg-amber-50 text-amber-600" },
    { label: "Assinaturas ativas", value: stats.active_subscriptions, icon: CreditCard, color: "bg-cyan-50 text-cyan-600" },
    { label: "Receita mensal", value: formatPrice(stats.monthly_revenue_cents, "BRL"), icon: DollarSign, color: "bg-slate-100 text-slate-700" },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Visão geral</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className="text-lg font-semibold text-slate-900">{card.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
