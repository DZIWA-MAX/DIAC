import Link from "next/link";
import { HardDrive, Files, Share2, Sparkles } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStorageUsed, formatBytes } from "@/lib/services/storage";
import { Card } from "@/components/ui/Card";
import type { Plan, Profile } from "@/types/database";

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<Profile>();

  const [{ count: filesCount }, { count: sharesCount }] = await Promise.all([
    supabase.from("files").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("shares").select("id", { count: "exact", head: true }).is("revoked_at", null),
  ]);

  const usedBytes = profile ? await getStorageUsed(supabase, user.id) : 0;

  let plan: Plan | null = null;
  if (profile?.plan_id) {
    const { data } = await supabase.from("plans").select("*").eq("id", profile.plan_id).single<Plan>();
    plan = data;
  }

  const firstName = (profile?.name || user.email || "").split(" ")[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Olá, {firstName}! 👋</h1>
        <p className="mt-1 text-slate-500">Bem-vindo de volta à sua nuvem.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Armazenamento</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatBytes(usedBytes)} / {formatBytes(profile?.storage_quota_bytes ?? 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Files className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Arquivos</p>
              <p className="text-lg font-semibold text-slate-900">{filesCount ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Share2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Compartilhados</p>
              <p className="text-lg font-semibold text-slate-900">{sharesCount ?? 0}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Plano</p>
              <p className="text-lg font-semibold text-slate-900">{plan?.name ?? "Grátis"}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">Pronto para organizar seus arquivos?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Envie seus primeiros arquivos ou crie pastas para começar.
            </p>
          </div>
          <Link
            href="/files"
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Ir para meus arquivos
          </Link>
        </div>
      </Card>
    </div>
  );
}
