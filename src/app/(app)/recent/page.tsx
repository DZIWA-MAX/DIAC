"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Loader2, Download, Star, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listRecentFiles, toggleFileFavorite } from "@/lib/services/files-client";
import { formatBytes, BUCKET } from "@/lib/storage-shared";
import { FileTypeIcon } from "@/components/dashboard/FileIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShareModal } from "@/components/dashboard/ShareModal";
import { useToast } from "@/components/ui/Toast";
import type { FileRecord } from "@/types/database";

export default function RecentPage() {
  const { notify } = useToast();
  const supabaseRef = useRef(createClient());
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareTarget, setShareTarget] = useState<FileRecord | null>(null);

  async function load() {
    setLoading(true);
    try {
      setFiles(await listRecentFiles(supabaseRef.current));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDownload(file: FileRecord) {
    const { data, error } = await supabaseRef.current.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 60, { download: file.name });
    if (error || !data) {
      notify("Erro ao gerar link de download.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handleFavorite(file: FileRecord) {
    await toggleFileFavorite(supabaseRef.current, file.id, !file.is_favorite);
    load();
  }

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Clock className="h-5 w-5 text-brand-600" /> Recentes
      </h1>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : files.length === 0 ? (
        <EmptyState icon={Clock} title="Nenhum arquivo recente" description="Arquivos enviados recentemente aparecerão aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileTypeIcon mimeType={file.mime_type} className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} · {new Date(file.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <button onClick={() => handleFavorite(file)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Favoritar">
                <Star className={`h-4 w-4 ${file.is_favorite ? "fill-amber-400 text-amber-400" : ""}`} />
              </button>
              <button onClick={() => setShareTarget(file)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Compartilhar">
                <Share2 className="h-4 w-4" />
              </button>
              <button onClick={() => handleDownload(file)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Baixar">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />
    </div>
  );
}
