import { HardDrive, Files, Users } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/services/storage";
import { Card } from "@/components/ui/Card";

interface Stats {
  total_users: number;
  total_files: number;
  total_storage_bytes: number;
}

export default async function AdminStoragePage() {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.rpc("admin_get_platform_stats").single<Stats>();

  const totalUsers = data?.total_users ?? 0;
  const totalStorage = data?.total_storage_bytes ?? 0;
  const avgPerUser = totalUsers > 0 ? totalStorage / totalUsers : 0;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Armazenamento</h1>
      <p className="mb-6 text-sm text-slate-500">
        Visão agregada — a plataforma nunca expõe o conteúdo de arquivos individuais de usuários por aqui.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <HardDrive className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Armazenamento total usado</p>
              <p className="text-lg font-semibold text-slate-900">{formatBytes(totalStorage)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Files className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Arquivos armazenados</p>
              <p className="text-lg font-semibold text-slate-900">{data?.total_files ?? 0}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs text-slate-500">Média por usuário</p>
              <p className="text-lg font-semibold text-slate-900">{formatBytes(avgPerUser)}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
