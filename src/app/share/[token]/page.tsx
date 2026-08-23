"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Download, Eye, FileWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Logo } from "@/components/ui/Logo";
import { formatBytes } from "@/lib/storage-shared";

interface Meta {
  file: { name: string; size: number; mimeType: string };
  requiresPassword: boolean;
  allowDownload: boolean;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Link inválido.");
        } else {
          setMeta(data);
          if (!data.requiresPassword) {
            await unlock("");
          }
        }
      } catch {
        setError("Não foi possível carregar este link.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function unlock(pwd: string) {
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch(`/api/share/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível acessar o arquivo.");
        return;
      }
      setResolvedUrl(data.url);
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 px-4 py-10">
      <Logo className="mb-8" />

      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
        {loading ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Carregando link...</p>
          </div>
        ) : error && !meta ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileWarning className="h-10 w-10 text-red-400" />
            <p className="text-sm text-slate-600">{error}</p>
          </div>
        ) : meta ? (
          <>
            <p className="truncate text-lg font-semibold text-slate-900">{meta.file.name}</p>
            <p className="mt-1 text-sm text-slate-500">{formatBytes(meta.file.size)}</p>

            {!resolvedUrl && meta.requiresPassword && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Lock className="h-4 w-4" /> Este link é protegido por senha
                </div>
                <TextField
                  label="Senha"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={error || undefined}
                />
                <Button onClick={() => unlock(password)} loading={unlocking} className="w-full">
                  Desbloquear
                </Button>
              </div>
            )}

            {resolvedUrl && (
              <div className="mt-6 space-y-3">
                {meta.allowDownload ? (
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full">
                      <Download className="h-4 w-4" /> Baixar arquivo
                    </Button>
                  </a>
                ) : (
                  <a href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                    <Button className="w-full" variant="outline">
                      <Eye className="h-4 w-4" /> Visualizar arquivo
                    </Button>
                  </a>
                )}
                <p className="text-center text-xs text-slate-400">
                  Este link de acesso expira em alguns minutos por segurança.
                </p>
              </div>
            )}
          </>
        ) : null}
      </div>

      <p className="mt-8 text-xs text-slate-400">Compartilhado via NuvemX</p>
    </div>
  );
}
