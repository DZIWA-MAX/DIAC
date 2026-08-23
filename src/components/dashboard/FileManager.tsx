"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Upload,
  FolderPlus,
  MoreVertical,
  Download,
  Pencil,
  FolderInput,
  Share2,
  Star,
  Trash2,
  Folder as FolderIcon,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  listFolders,
  listFiles,
  getFolderPath,
  createFolder,
  renameFolder,
  renameFile,
  moveFolder,
  moveFile,
  toggleFolderFavorite,
  toggleFileFavorite,
  trashFolder,
  trashFile,
} from "@/lib/services/files-client";
import { formatBytes, BUCKET } from "@/lib/storage-shared";
import { useUploadQueue } from "@/lib/hooks/useUploadQueue";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { EmptyState } from "@/components/ui/EmptyState";
import { Breadcrumbs } from "./Breadcrumbs";
import { FileTypeIcon } from "./FileIcon";
import { UploadPanel } from "./UploadPanel";
import { ShareModal } from "./ShareModal";
import { MoveModal } from "./MoveModal";
import type { FileRecord, Folder } from "@/types/database";

type Row =
  | { kind: "folder"; data: Folder }
  | { kind: "file"; data: FileRecord };

export function FileManager({ folderId }: { folderId: string | null }) {
  const { notify } = useToast();
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [path, setPath] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameTarget, setRenameTarget] = useState<Row | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [moveTarget, setMoveTarget] = useState<Row | null>(null);
  const [shareTarget, setShareTarget] = useState<FileRecord | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [f, fl, p] = await Promise.all([
        listFolders(supabase, folderId),
        listFiles(supabase, folderId),
        getFolderPath(supabase, folderId),
      ]);
      setFolders(f);
      setFiles(fl);
      setPath(p);
    } catch {
      notify("Erro ao carregar arquivos.", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderId]);

  useEffect(() => {
    load();
  }, [load]);

  const { items: uploadItems, upload, cancel, dismiss } = useUploadQueue(load);

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    Array.from(fileList).forEach((file) => upload(file, folderId));
  }

  async function handleCreateFolder() {
    if (!newFolderName.trim()) return;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await createFolder(supabase, user.id, folderId, newFolderName);
      notify("Pasta criada com sucesso.", "success");
      setNewFolderName("");
      setNewFolderOpen(false);
      load();
    } catch {
      notify("Erro ao criar pasta.", "error");
    }
  }

  async function handleRename() {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      if (renameTarget.kind === "folder") {
        await renameFolder(supabase, renameTarget.data.id, renameValue);
      } else {
        await renameFile(supabase, renameTarget.data.id, renameValue);
      }
      notify("Renomeado com sucesso.", "success");
      setRenameTarget(null);
      load();
    } catch {
      notify("Erro ao renomear.", "error");
    }
  }

  async function handleMoveConfirm(targetFolderId: string | null) {
    if (!moveTarget) return;
    try {
      if (moveTarget.kind === "folder") {
        await moveFolder(supabase, moveTarget.data.id, targetFolderId);
      } else {
        await moveFile(supabase, moveTarget.data.id, targetFolderId);
      }
      notify("Item movido com sucesso.", "success");
      setMoveTarget(null);
      load();
    } catch {
      notify("Erro ao mover item.", "error");
    }
  }

  async function handleFavorite(row: Row) {
    try {
      if (row.kind === "folder") {
        await toggleFolderFavorite(supabase, row.data.id, !row.data.is_favorite);
      } else {
        await toggleFileFavorite(supabase, row.data.id, !row.data.is_favorite);
      }
      load();
    } catch {
      notify("Erro ao atualizar favorito.", "error");
    }
  }

  async function handleDelete(row: Row) {
    try {
      if (row.kind === "folder") {
        await trashFolder(supabase, row.data.id);
      } else {
        await trashFile(supabase, row.data.id);
      }
      notify(
        row.kind === "folder" ? "Pasta movida para a lixeira." : "Arquivo movido para a lixeira.",
        "success"
      );
      load();
    } catch {
      notify("Erro ao excluir.", "error");
    }
  }

  async function handleDownload(file: FileRecord) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(file.storage_path, 60, { download: file.name });
    if (error || !data) {
      notify("Erro ao gerar link de download.", "error");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  const isEmpty = !loading && folders.length === 0 && files.length === 0;

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative min-h-[60vh] rounded-2xl transition-colors ${dragOver ? "bg-brand-50/60 ring-2 ring-brand-400" : ""}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Breadcrumbs path={path} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
            <FolderPlus className="h-4 w-4" /> Nova pasta
          </Button>
          <Button size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Enviar arquivo
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={FolderIcon}
          title="Nenhum arquivo por aqui"
          description="Arraste arquivos para esta área ou use o botão 'Enviar arquivo' para começar."
          action={
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Plus className="h-4 w-4" /> Enviar arquivo
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1fr_120px_160px_140px_40px] gap-4 border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-400 sm:grid">
            <span>Nome</span>
            <span>Tamanho</span>
            <span>Modificado</span>
            <span>Proprietário</span>
            <span />
          </div>

          {folders.map((folder) => (
            <RowItem
              key={folder.id}
              row={{ kind: "folder", data: folder }}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onOpen={() => { window.location.href = `/files/${folder.id}`; }}
              onRename={() => { setRenameTarget({ kind: "folder", data: folder }); setRenameValue(folder.name); }}
              onMove={() => setMoveTarget({ kind: "folder", data: folder })}
              onFavorite={() => handleFavorite({ kind: "folder", data: folder })}
              onDelete={() => handleDelete({ kind: "folder", data: folder })}
            />
          ))}

          {files.map((file) => (
            <RowItem
              key={file.id}
              row={{ kind: "file", data: file }}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              onOpen={() => handleDownload(file)}
              onRename={() => { setRenameTarget({ kind: "file", data: file }); setRenameValue(file.name); }}
              onMove={() => setMoveTarget({ kind: "file", data: file })}
              onShare={() => setShareTarget(file)}
              onFavorite={() => handleFavorite({ kind: "file", data: file })}
              onDelete={() => handleDelete({ kind: "file", data: file })}
            />
          ))}
        </div>
      )}

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="Nova pasta"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewFolderOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateFolder}>Criar</Button>
          </>
        }
      >
        <TextField
          label="Nome da pasta"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          autoFocus
        />
      </Modal>

      <Modal
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
        title="Renomear"
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={handleRename}>Salvar</Button>
          </>
        }
      >
        <TextField label="Novo nome" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
      </Modal>

      <MoveModal
        open={!!moveTarget}
        onClose={() => setMoveTarget(null)}
        onConfirm={handleMoveConfirm}
        excludeFolderId={moveTarget?.kind === "folder" ? moveTarget.data.id : undefined}
      />

      <ShareModal file={shareTarget} onClose={() => setShareTarget(null)} />

      <UploadPanel items={uploadItems} onCancel={cancel} onDismiss={dismiss} />
    </div>
  );
}

function RowItem({
  row,
  openMenuId,
  setOpenMenuId,
  onOpen,
  onRename,
  onMove,
  onShare,
  onFavorite,
  onDelete,
}: {
  row: Row;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onShare?: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const isFolder = row.kind === "folder";
  const name = row.data.name;
  const isFavorite = row.data.is_favorite;
  const menuId = `${row.kind}-${row.data.id}`;
  const updatedAt = new Date(row.data.updated_at).toLocaleDateString("pt-BR");

  return (
    <div className="grid grid-cols-[1fr_40px] items-center gap-2 border-b border-slate-50 px-4 py-2.5 last:border-b-0 hover:bg-slate-50 sm:grid-cols-[1fr_120px_160px_140px_40px]">
      <button onClick={onOpen} className="flex min-w-0 items-center gap-3 text-left">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isFolder ? "bg-brand-50 text-brand-600" : "bg-slate-100 text-slate-500"}`}>
          {isFolder ? <FolderIcon className="h-4.5 w-4.5" size={18} /> : <FileTypeIcon mimeType={(row.data as FileRecord).mime_type} className="h-4.5 w-4.5" />}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
            {name}
            {isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
          </span>
        </span>
      </button>

      <span className="hidden text-sm text-slate-500 sm:block">
        {!isFolder ? formatBytes((row.data as FileRecord).size) : "—"}
      </span>
      <span className="hidden text-sm text-slate-500 sm:block">{updatedAt}</span>
      <span className="hidden text-sm text-slate-500 sm:block">Você</span>

      <div className="relative flex justify-end">
        <button
          onClick={() => setOpenMenuId(openMenuId === menuId ? null : menuId)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Mais ações"
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {openMenuId === menuId && (
          <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card">
            <button onClick={() => { onOpen(); setOpenMenuId(null); }} className="menu-item">
              {isFolder ? <FolderIcon className="h-4 w-4" /> : <Download className="h-4 w-4" />}
              {isFolder ? "Abrir" : "Baixar"}
            </button>
            <button onClick={() => { onRename(); setOpenMenuId(null); }} className="menu-item">
              <Pencil className="h-4 w-4" /> Renomear
            </button>
            <button onClick={() => { onMove(); setOpenMenuId(null); }} className="menu-item">
              <FolderInput className="h-4 w-4" /> Mover
            </button>
            {onShare && (
              <button onClick={() => { onShare(); setOpenMenuId(null); }} className="menu-item">
                <Share2 className="h-4 w-4" /> Compartilhar
              </button>
            )}
            <button onClick={() => { onFavorite(); setOpenMenuId(null); }} className="menu-item">
              <Star className="h-4 w-4" /> {isFavorite ? "Remover favorito" : "Favoritar"}
            </button>
            <button onClick={() => { onDelete(); setOpenMenuId(null); }} className="menu-item text-red-600">
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
