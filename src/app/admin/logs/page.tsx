import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminLogsPage() {
  const supabase = createServerSupabaseClient();
  const { data: logs } = await supabase
    .from("security_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Logs de segurança</h1>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-100 text-xs text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Ação</th>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{log.action}</td>
                <td className="px-4 py-3 text-slate-500">{log.user_id?.slice(0, 8) ?? "sistema"}</td>
                <td className="px-4 py-3 text-slate-500">{log.ip_address ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                  Nenhum evento registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
