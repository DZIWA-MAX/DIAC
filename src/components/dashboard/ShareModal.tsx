"use client";

import { useState } from "react";
import { Copy, Link2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { useToast } from "@/components/ui/Toast";
import type { FileRecord } from "@/types/database";

export function ShareModal({
  file,
  onClose,
}: {
  file: FileRecord | null;
  onClose: () => void;
}) {
  const { notify } = useToast();
  const [allowDownload, setAllowDownload] = useState(true);
  const [password, setPassword] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);

  async function createShare() {
    if (!file) return;
    setLoading(true);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: file.id,
          allowDownload,
          password: password || undefined,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        notify(data.error || "Erro ao criar link.", "error");
        return;
      }
      setShareUrl(`${window.location.origin}/share/${data.share.token}`);
      setShareId(data.share.id);
      notify("Link de compartilhamento criado.", "success");
    } finally {
      setLoading(false);
    }
  }

  async function revoke() {
    if (!shareId) return;
    await fetch(`/api/shares/${shareId}`, { method: "DELETE" });
    notify("Link revogado.", "info");
    setShareUrl(null);
    setShareId(null);
  }

  function reset() {
    setShareUrl(null);
    setShareId(null);
    setPassword("");
    setExpiresAt("");
    setAllowDownload(true);
    onClose();
  }

  return (
    <Modal open={!!file} onClose={reset} title={`Compartilhar "${file?.name ?? ""}"`}>
      {!shareUrl ? (
        <div className="space-y-4">
          <label className="flex items-center justify-between text-sm text-slate-700">
            Permitir download
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
          </label>
          <TextField
            label="Proteger com senha (opcional)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Deixe em branco para não exigir senha"
          />
          <TextField
            label="Expira em (opcional)"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <Button onClick={createShare} loading={loading} className="w-full">
            <Link2 className="h-4 w-4" /> Gerar link
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <input readOnly value={shareUrl} className="flex-1 truncate bg-transparent text-sm text-slate-700 outline-none" />
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                notify("Link copiado.", "success");
              }}
              className="text-slate-400 hover:text-slate-700"
              aria-label="Copiar link"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <Button variant="danger" onClick={revoke} className="w-full">
            <Trash2 className="h-4 w-4" /> Revogar link
          </Button>
        </div>
      )}
    </Modal>
  );
}
