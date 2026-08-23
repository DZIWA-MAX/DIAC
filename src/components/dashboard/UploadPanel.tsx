"use client";

import { CheckCircle2, X, AlertTriangle, Loader2, UploadCloud } from "lucide-react";
import { formatBytes } from "@/lib/storage-shared";
import type { UploadItem } from "@/lib/hooks/useUploadQueue";

export function UploadPanel({
  items,
  onCancel,
  onDismiss,
}: {
  items: UploadItem[];
  onCancel: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-card lg:bottom-6 lg:left-72">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <UploadCloud className="h-4 w-4 text-brand-600" />
        <p className="text-sm font-medium text-slate-700">Enviando arquivos</p>
      </div>
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl px-3 py-2.5 hover:bg-slate-50">
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.name}</p>
              {item.status === "uploading" && (
                <button onClick={() => onCancel(item.id)} aria-label="Cancelar" className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {item.status !== "uploading" && (
                <button onClick={() => onDismiss(item.id)} aria-label="Fechar" className="text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {item.status === "uploading" && (
              <>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> {item.progress}%
                  </span>
                  <span>{formatBytes(item.speedBps)}/s</span>
                </div>
              </>
            )}

            {item.status === "done" && (
              <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Concluído · {formatBytes(item.size)}
              </p>
            )}

            {item.status === "error" && (
              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" /> {item.error || "Falha no upload"}
              </p>
            )}

            {item.status === "canceled" && (
              <p className="mt-1 text-xs text-slate-400">Cancelado</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
