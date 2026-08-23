"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { checkPasswordStrength } from "@/lib/password";
import { useToast } from "@/components/ui/Toast";

function ResetPasswordForm() {
  const router = useRouter();
  const { notify } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const check = checkPasswordStrength(password);

    if (!check.valid) {
      setError(`Senha fraca: falta ${check.errors.join(", ")}.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    notify("Senha alterada com sucesso.", "success");
    router.push("/dashboard");
  }

  return (
    <AuthShell title="Definir nova senha" subtitle="Escolha uma senha forte para sua conta.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Nova senha"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <TextField
          label="Confirmar nova senha"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" loading={loading} className="w-full">
          Salvar nova senha
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
