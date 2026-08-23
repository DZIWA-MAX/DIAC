"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordStrength } from "@/lib/password";
import { useToast } from "@/components/ui/Toast";

export default function RegisterPage() {
  const router = useRouter();
  const { notify } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const passwordCheck = checkPasswordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!name.trim()) nextErrors.name = "Informe seu nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Email inválido.";
    if (!passwordCheck.valid) nextErrors.password = `Senha fraca: falta ${passwordCheck.errors.join(", ")}.`;
    if (password !== confirmPassword) nextErrors.confirmPassword = "As senhas não coincidem.";
    if (!agreeTerms) nextErrors.terms = "Você deve aceitar os termos para continuar.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    setLoading(false);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("Conta criada! Verifique seu email para confirmar o cadastro.", "success");
    router.push("/login");
  }

  return (
    <AuthShell
      title="Criar sua conta gratuita"
      subtitle="Comece a usar a NuvemX em menos de um minuto."
      footer={
        <>
          Já tem uma conta?{" "}
          <Link href="/login" className="font-medium text-brand-600 hover:underline">
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <TextField
          label="Nome"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <TextField
          label="Senha"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <TextField
          label="Confirmar senha"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
        />

        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            Eu concordo com os{" "}
            <Link href="/terms" className="text-brand-600 hover:underline">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy" className="text-brand-600 hover:underline">
              Política de Privacidade
            </Link>
            .
          </span>
        </label>
        {errors.terms && <p className="text-xs text-red-600">{errors.terms}</p>}

        <Button type="submit" loading={loading} className="w-full">
          Criar conta
        </Button>
      </form>
    </AuthShell>
  );
}
