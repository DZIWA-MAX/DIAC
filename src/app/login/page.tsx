"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { notify } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const reason = params.get("reason");
  const notice =
    reason === "session_expired"
      ? "Sua sessão expirou. Faça login novamente."
      : reason === "blocked"
        ? "Sua conta está bloqueada. Contate o suporte."
        : null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Email ou senha inválidos.");
      return;
    }

    fetch("/api/auth/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auth.login" }),
    }).catch(() => {});

    notify("Login realizado com sucesso.", "success");
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Entrar na sua conta"
      subtitle="Acesse sua nuvem pessoal."
      footer={
        <>
          Ainda não tem uma conta?{" "}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Criar conta
          </Link>
        </>
      }
    >
      {notice && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-800">
          {notice}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-slate-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Permanecer conectado
          </label>
          <Link href="/forgot-password" className="font-medium text-brand-600 hover:underline">
            Esqueceu a senha?
          </Link>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>

        <div className="relative py-2 text-center text-xs text-slate-400">
          <span className="bg-white px-2">ou continue com</span>
          <div className="absolute inset-x-0 top-1/2 -z-10 h-px bg-slate-200" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button type="button" variant="outline" disabled title="Em breve">
            Google
          </Button>
          <Button type="button" variant="outline" disabled title="Em breve">
            Apple
          </Button>
          <Button type="button" variant="outline" disabled title="Em breve">
            GitHub
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
