"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Star, Loader2, Download, Folder as FolderIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listFavorites, toggleFileFavorite, toggleFolderFavorite } from "@/lib/services/files-client";
import { formatBytes, BUCKET } from "@/lib/storage-shared";
import { FileTypeIcon } from "@/components/dashboard/FileIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { FileRecord, Folder } from "@/types/database";

export default function FavoritesPage() {
  const { notify } = useToast();
  const supabaseRef = useRef(createClient());
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listFavorites(supabaseRef.current);
      setFiles(data.files);
      setFolders(data.folders);
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

  const isEmpty = !loading && files.length === 0 && folders.length === 0;

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold text-slate-900">
        <Star className="h-5 w-5 text-amber-500" /> Favoritos
      </h1>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isEmpty ? (
        <EmptyState icon={Star} title="Nenhum favorito ainda" description="Marque arquivos e pastas como favoritos para encontrá-los rapidamente aqui." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <FolderIcon className="h-4.5 w-4.5" />
              </span>
              <Link href={`/files/${folder.id}`} className="min-w-0 flex-1 text-sm font-medium text-slate-800 hover:underline">
                {folder.name}
              </Link>
              <button
                onClick={async () => { await toggleFolderFavorite(supabaseRef.current, folder.id, false); load(); }}
                className="rounded-lg p-2 text-amber-500 hover:bg-slate-100"
                aria-label="Remover favorito"
              >
                <Star className="h-4 w-4 fill-amber-400" />
              </button>
            </div>
          ))}

          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <FileTypeIcon mimeType={file.mime_type} className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={async () => { await toggleFileFavorite(supabaseRef.current, file.id, false); load(); }}
                className="rounded-lg p-2 text-amber-500 hover:bg-slate-100"
                aria-label="Remover favorito"
              >
                <Star className="h-4 w-4 fill-amber-400" />
              </button>
              <button onClick={() => handleDownload(file)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Baixar">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
