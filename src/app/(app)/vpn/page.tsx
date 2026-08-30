"use client";

import { useEffect, useState } from "react";
import {
  ShieldCheck,
  Loader2,
  Plus,
  Copy,
  XCircle,
  Download,
  RefreshCw,
  Smartphone,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatBytes } from "@/lib/storage-shared";
import type { VpnProfilePublic } from "@/types/database";

export default function VpnPage() {
  const { notify } = useToast();
  const [profiles, setProfiles] = useState<VpnProfilePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  // The config URL is only ever held in memory, never persisted — it is
  // a credential, and it expires.
  const [issuedLink, setIssuedLink] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vpn/profiles");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setProfiles(json.profiles ?? []);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao carregar perfis de VPN.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/vpn/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: deviceName }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setIssuedLink(absoluteUrl(json.configUrl));
      setDeviceName("");
      setModalOpen(false);
      notify("Perfil de VPN criado.", "success");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao criar perfil.", "error");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/vpn/profiles/${id}`, { method: "DELETE" });
    if (res.ok) {
      notify("Dispositivo revogado.", "info");
      load();
    } else {
      notify("Não foi possível revogar.", "error");
    }
  }

  async function regenerate(id: string) {
    try {
      const res = await fetch(`/api/vpn/profiles/${id}`, { method: "PATCH" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setIssuedLink(absoluteUrl(json.configUrl));
      notify("Novo link gerado. O anterior deixou de funcionar.", "success");
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : "Erro ao gerar link.", "error");
    }
  }

  function absoluteUrl(path: string) {
    return `${window.location.origin}${path}`;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-slate-900">
          <ShieldCheck className="h-5 w-5 text-brand-600" /> VPN
        </h1>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4" /> Novo dispositivo
        </Button>
      </div>

      <p className="mb-6 max-w-2xl text-sm text-slate-500">
        Crie um perfil de VPN para cada dispositivo. Você recebe uma URL única com a configuração
        pronta para importar no app WireGuard — a URL expira em 15 minutos e pode ser gerada de novo
        quando precisar.
      </p>

      {issuedLink && (
        <div className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
            <Smartphone className="h-4 w-4" /> Sua URL de VPN
          </p>
          <p className="mt-1 text-xs text-brand-700">
            Abra no dispositivo ou baixe o arquivo <code>.conf</code>. Válida por 15 minutos e some
            desta tela ao recarregar — trate como uma senha.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={issuedLink}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-brand-200 bg-white px-3 py-2 font-mono text-xs text-slate-700"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(issuedLink);
                  notify("URL copiada.", "success");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <a href={issuedLink} download>
                <Button size="sm">
                  <Download className="h-3.5 w-3.5" /> Baixar .conf
                </Button>
              </a>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum dispositivo de VPN"
          description="Crie seu primeiro perfil para navegar através da sua VPN."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-2 border-b border-slate-50 px-4 py-3 last:border-b-0 hover:bg-slate-50 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{p.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  {p.address && <span className="font-mono">{p.address}</span>}
                  {p.server_name && <span>{p.server_name}</span>}
                  <span>
                    {p.last_handshake_at
                      ? `Conectado ${new Date(p.last_handshake_at).toLocaleString("pt-BR")}`
                      : "Nunca conectado"}
                  </span>
                  {(p.rx_bytes > 0 || p.tx_bytes > 0) && (
                    <span>
                      ↓ {formatBytes(p.rx_bytes)} · ↑ {formatBytes(p.tx_bytes)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => regenerate(p.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                  aria-label="Gerar nova URL"
                  title="Gerar nova URL de configuração"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={() => revoke(p.id)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label="Revogar dispositivo"
                  title="Revogar dispositivo"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo dispositivo de VPN"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={create} loading={creating}>
              Criar
            </Button>
          </>
        }
      >
        <form onSubmit={create}>
          <TextField
            label="Nome do dispositivo"
            placeholder="Ex.: Meu celular"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            maxLength={60}
            required
            autoFocus
          />
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            As chaves são geradas no servidor e a URL aparece uma única vez após a criação.
          </p>
        </form>
      </Modal>
    </div>
  );
}
