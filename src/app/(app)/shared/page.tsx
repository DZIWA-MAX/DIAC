"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Loader2, Copy, XCircle, Lock, Eye, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { FileRecord, Share } from "@/types/database";

interface ShareWithFile extends Share {
  files: Pick<FileRecord, "id" | "name" | "mime_type" | "size"> | null;
}

export default function SharedPage() {
  const { notify } = useToast();
  const supabaseRef = useRef(createClient());
  const [shares, setShares] = useState<ShareWithFile[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabaseRef.current
        .from("shares")
        .select("*, files ( id, name, mime_type, size )")
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setShares((data ?? []) as unknown as ShareWithFile[]);
    } catch {
      notify("Erro ao carregar compartilhamentos.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function revoke(id: string) {
    const res = await fetch(`/api/shares/${id}`, { method: "DELETE" });
    if (res.ok) {
      notify("Link revogado.", "info");
      load();
    }
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/share/${token}`);
    notify("Link copiado.", "success");
  }

  const isExpired = (share: Share) => !!share.expires_at && new Date(share.expires_at) < new Date();

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Share2 className="h-5 w-5 text-brand-600" /> Compartilhados
      </h1>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : shares.length === 0 ? (
        <EmptyState icon={Share2} title="Nenhum link ativo" description="Links de compartilhamento que você criar aparecerão aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {shares.map((share) => (
            <div key={share.id} className="flex flex-col gap-2 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{share.files?.name ?? "Arquivo removido"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  {share.password_hash && (
                    <span className="flex items-center gap-1">
                      <Lock className="h-3 w-3" /> Protegido por senha
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    {share.allow_download ? <Download className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {share.allow_download ? "Download permitido" : "Somente visualização"}
                  </span>
                  <span>{share.view_count} acessos</span>
                  {isExpired(share) && <span className="font-medium text-red-500">Expirado</span>}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => copyLink(share.token)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Copiar link">
                  <Copy className="h-4 w-4" />
                </button>
                <button onClick={() => revoke(share.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Revogar">
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
