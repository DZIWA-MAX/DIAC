"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Folder as FolderIcon, Home } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { listFolders } from "@/lib/services/files-client";
import type { Folder } from "@/types/database";

export function MoveModal({
  open,
  onClose,
  onConfirm,
  excludeFolderId,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => void;
  excludeFolderId?: string;
}) {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [trail, setTrail] = useState<Folder[]>([]);
  const [children, setChildren] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentId(null);
    setTrail([]);
    load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function load(folderId: string | null) {
    setLoading(true);
    try {
      const supabase = createClient();
      const list = await listFolders(supabase, folderId);
      setChildren(list.filter((f) => f.id !== excludeFolderId));
    } finally {
      setLoading(false);
    }
  }

  function enter(folder: Folder) {
    setTrail((prev) => [...prev, folder]);
    setCurrentId(folder.id);
    load(folder.id);
  }

  function goTo(index: number) {
    if (index === -1) {
      setTrail([]);
      setCurrentId(null);
      load(null);
      return;
    }
    const next = trail.slice(0, index + 1);
    setTrail(next);
    setCurrentId(next[next.length - 1].id);
    load(next[next.length - 1].id);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mover para"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(currentId)}>Mover para cá</Button>
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-1 text-sm text-slate-500">
        <button onClick={() => goTo(-1)} className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-slate-100">
          <Home className="h-3.5 w-3.5" /> Raiz
        </button>
        {trail.map((folder, i) => (
          <span key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            <button onClick={() => goTo(i)} className="rounded-lg px-2 py-1 hover:bg-slate-100">
              {folder.name}
            </button>
          </span>
        ))}
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-1">
        {loading ? (
          <p className="px-3 py-6 text-center text-sm text-slate-400">Carregando...</p>
        ) : children.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-400">Nenhuma subpasta aqui.</p>
        ) : (
          children.map((folder) => (
            <button
              key={folder.id}
              onClick={() => enter(folder)}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <FolderIcon className="h-4 w-4 text-brand-500" />
              {folder.name}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
