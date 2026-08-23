"use client";

import { useState } from "react";
import { User, ShieldCheck, HardDrive, CreditCard, Lock } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordStrength } from "@/lib/password";
import { formatBytes } from "@/lib/storage-shared";
import { formatPrice } from "@/lib/services/plans";
import type { Plan, Profile, Subscription } from "@/types/database";
import { useRouter } from "next/navigation";
import clsx from "clsx";

const TABS = [
  { id: "profile", label: "Perfil", icon: User },
  { id: "security", label: "Segurança", icon: ShieldCheck },
  { id: "storage", label: "Armazenamento", icon: HardDrive },
  { id: "subscription", label: "Assinatura", icon: CreditCard },
  { id: "privacy", label: "Privacidade", icon: Lock },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SettingsTabs({
  profile,
  email,
  plan,
  subscription,
  usedBytes,
}: {
  profile: Profile;
  email: string;
  plan: Plan | null;
  subscription: Subscription | null;
  usedBytes: number;
}) {
  const [tab, setTab] = useState<TabId>("profile");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Configurações</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-none lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                tab === t.id ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </nav>

        <div className="flex-1">
          {tab === "profile" && <ProfileTab profile={profile} email={email} />}
          {tab === "security" && <SecurityTab />}
          {tab === "storage" && <StorageTab profile={profile} plan={plan} usedBytes={usedBytes} />}
          {tab === "subscription" && <SubscriptionTab plan={plan} subscription={subscription} />}
          {tab === "privacy" && <PrivacyTab />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile, email }: { profile: Profile; email: string }) {
  const { notify } = useToast();
  const [name, setName] = useState(profile.name);
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", profile.id);
    setLoading(false);
    notify(error ? "Erro ao salvar perfil." : "Perfil atualizado.", error ? "error" : "success");
  }

  return (
    <Card className="max-w-lg space-y-4">
      <h2 className="font-semibold text-slate-900">Perfil</h2>
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-semibold text-brand-700">
          {name.charAt(0).toUpperCase() || "?"}
        </span>
        <p className="text-sm text-slate-500">Foto de perfil (em breve)</p>
      </div>
      <TextField label="Nome" value={name} onChange={(e) => setName(e.target.value)} />
      <TextField label="Email" value={email} disabled />
      <Button onClick={save} loading={loading}>
        Salvar alterações
      </Button>
    </Card>
  );
}

function SecurityTab() {
  const { notify } = useToast();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function changePassword() {
    const check = checkPasswordStrength(next);
    if (!check.valid) {
      setError(`Senha fraca: falta ${check.errors.join(", ")}.`);
      return;
    }
    if (next !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    notify("Senha alterada com sucesso.", "success");
  }

  async function signOutEverywhere() {
    const supabase = createClient();
    await supabase.auth.signOut({ scope: "global" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-lg space-y-4">
        <h2 className="font-semibold text-slate-900">Alterar senha</h2>
        <TextField label="Senha atual" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <TextField label="Nova senha" type="password" value={next} onChange={(e) => setNext(e.target.value)} error={error} />
        <TextField label="Confirmar nova senha" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button onClick={changePassword} loading={loading}>
          Atualizar senha
        </Button>
      </Card>

      <Card className="max-w-lg space-y-3">
        <h2 className="font-semibold text-slate-900">Sessões ativas</h2>
        <p className="text-sm text-slate-500">
          Se você suspeitar de acesso não autorizado, encerre a sessão em todos os dispositivos.
        </p>
        <Button variant="outline" onClick={signOutEverywhere}>
          Sair de todos os dispositivos
        </Button>
      </Card>

      <Card className="max-w-lg space-y-2">
        <h2 className="font-semibold text-slate-900">Autenticação em duas etapas (2FA)</h2>
        <p className="text-sm text-slate-500">Em breve você poderá exigir um código adicional ao entrar.</p>
        <span className="inline-block w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
          Em desenvolvimento
        </span>
      </Card>
    </div>
  );
}

function StorageTab({ profile, plan, usedBytes }: { profile: Profile; plan: Plan | null; usedBytes: number }) {
  const pct = Math.min(100, Math.round((usedBytes / Math.max(profile.storage_quota_bytes, 1)) * 100));
  return (
    <Card className="max-w-lg space-y-4">
      <h2 className="font-semibold text-slate-900">Armazenamento</h2>
      <div>
        <div className="mb-1.5 flex justify-between text-sm text-slate-600">
          <span>{formatBytes(usedBytes)} usados</span>
          <span>{formatBytes(profile.storage_quota_bytes)} total</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Plano atual: <strong className="text-slate-800">{plan?.name ?? "Grátis"}</strong>
      </p>
      <a href="/plans" className="inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
        Aumentar armazenamento
      </a>
    </Card>
  );
}

function SubscriptionTab({ plan, subscription }: { plan: Plan | null; subscription: Subscription | null }) {
  const statusLabels: Record<string, string> = {
    active: "Ativa",
    trialing: "Em teste",
    past_due: "Pagamento pendente",
    canceled: "Cancelada",
    expired: "Expirada",
  };

  return (
    <Card className="max-w-lg space-y-3">
      <h2 className="font-semibold text-slate-900">Assinatura</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-slate-400">Plano</p>
          <p className="font-medium text-slate-800">{plan?.name ?? "Grátis"}</p>
        </div>
        <div>
          <p className="text-slate-400">Status</p>
          <p className="font-medium text-slate-800">
            {subscription ? statusLabels[subscription.status] : "Sem assinatura ativa"}
          </p>
        </div>
        <div>
          <p className="text-slate-400">Preço</p>
          <p className="font-medium text-slate-800">{plan ? formatPrice(plan.price_cents, plan.currency) : "—"}</p>
        </div>
        <div>
          <p className="text-slate-400">Próxima cobrança</p>
          <p className="font-medium text-slate-800">
            {subscription?.current_period_end
              ? new Date(subscription.current_period_end).toLocaleDateString("pt-BR")
              : "—"}
          </p>
        </div>
      </div>
      <a href="/plans" className="inline-block text-sm font-medium text-brand-600 hover:underline">
        Ver todos os planos →
      </a>
    </Card>
  );
}

function PrivacyTab() {
  const { notify } = useToast();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function exportData() {
    window.location.href = "/api/settings/export";
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/settings/delete-account", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        notify(data.error || "Erro ao excluir conta.", "error");
        return;
      }
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="max-w-lg space-y-3">
        <h2 className="font-semibold text-slate-900">Exportar dados</h2>
        <p className="text-sm text-slate-500">
          Baixe uma cópia de todos os seus dados armazenados na NuvemX (metadados de arquivos, pastas e assinatura).
        </p>
        <Button variant="outline" onClick={exportData}>
          Exportar meus dados
        </Button>
      </Card>

      <Card className="max-w-lg space-y-3 border-red-200">
        <h2 className="font-semibold text-red-700">Excluir conta</h2>
        <p className="text-sm text-slate-500">
          Esta ação é permanente. Todos os seus arquivos, pastas e links de compartilhamento serão excluídos.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Excluir minha conta
        </Button>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirmar exclusão de conta"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteAccount} loading={deleting} disabled={confirmText !== "EXCLUIR"}>
              Excluir permanentemente
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Digite <strong>EXCLUIR</strong> para confirmar. Esta ação não pode ser desfeita.
        </p>
        <TextField label="Confirmação" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </Modal>
    </div>
  );
}
