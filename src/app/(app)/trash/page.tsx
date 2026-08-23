"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2, Loader2, RotateCcw, XCircle, Folder as FolderIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { listTrashedFiles, listTrashedFolders, restoreFile, restoreFolder } from "@/lib/services/files-client";
import { formatBytes } from "@/lib/storage-shared";
import { FileTypeIcon } from "@/components/dashboard/FileIcon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { FileRecord, Folder } from "@/types/database";

export default function TrashPage() {
  const { notify } = useToast();
  const supabaseRef = useRef(createClient());
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [emptying, setEmptying] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [fl, fo] = await Promise.all([
        listTrashedFiles(supabaseRef.current),
        listTrashedFolders(supabaseRef.current),
      ]);
      setFiles(fl);
      setFolders(fo);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestoreFile(file: FileRecord) {
    await restoreFile(supabaseRef.current, file.id);
    notify("Arquivo restaurado.", "success");
    load();
  }

  async function handleRestoreFolder(folder: Folder) {
    await restoreFolder(supabaseRef.current, folder.id);
    notify("Pasta restaurada.", "success");
    load();
  }

  async function handlePermanentDeleteFile(file: FileRecord) {
    const res = await fetch(`/api/files/${file.id}/permanent`, { method: "DELETE" });
    if (res.ok) {
      notify("Arquivo excluído permanentemente.", "success");
      load();
    } else {
      notify("Erro ao excluir arquivo.", "error");
    }
  }

  async function handleEmptyTrash() {
    setEmptying(true);
    try {
      const res = await fetch("/api/trash/empty", { method: "POST" });
      if (res.ok) {
        notify("Lixeira esvaziada.", "success");
        setConfirmEmpty(false);
        load();
      } else {
        notify("Erro ao esvaziar lixeira.", "error");
      }
    } finally {
      setEmptying(false);
    }
  }

  const isEmpty = !loading && files.length === 0 && folders.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <Trash2 className="h-5 w-5 text-slate-500" /> Lixeira
        </h1>
        {!isEmpty && (
          <Button variant="danger" size="sm" onClick={() => setConfirmEmpty(true)}>
            Esvaziar lixeira
          </Button>
        )}
      </div>

      <p className="mb-4 text-sm text-slate-500">
        Itens na lixeira são excluídos permanentemente após 30 dias.
      </p>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isEmpty ? (
        <EmptyState icon={Trash2} title="A lixeira está vazia" description="Itens excluídos aparecerão aqui antes de serem removidos definitivamente." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {folders.map((folder) => (
            <div key={folder.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FolderIcon className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{folder.name}</p>
                <p className="text-xs text-slate-400">
                  Excluído em {folder.deleted_at ? new Date(folder.deleted_at).toLocaleDateString("pt-BR") : "-"}
                </p>
              </div>
              <button onClick={() => handleRestoreFolder(folder)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Restaurar">
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          ))}

          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <FileTypeIcon mimeType={file.mime_type} className="h-4.5 w-4.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-xs text-slate-400">
                  {formatBytes(file.size)} · Excluído em {file.deleted_at ? new Date(file.deleted_at).toLocaleDateString("pt-BR") : "-"}
                </p>
              </div>
              <button onClick={() => handleRestoreFile(file)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Restaurar">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => handlePermanentDeleteFile(file)} className="rounded-lg p-2 text-red-500 hover:bg-red-50" aria-label="Excluir permanentemente">
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={confirmEmpty}
        onClose={() => setConfirmEmpty(false)}
        title="Esvaziar lixeira"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmEmpty(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleEmptyTrash} loading={emptying}>
              Excluir permanentemente
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Esta ação excluirá permanentemente todos os itens da lixeira. Isso não pode ser desfeito.
        </p>
      </Modal>
    </div>
  );
}
