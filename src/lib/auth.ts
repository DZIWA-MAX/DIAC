import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export class UnauthorizedError extends Error {
  constructor(message = "Não autenticado.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Acesso negado.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/**
 * Resolves the authenticated user + their profile row from the request's
 * session cookies. Throws if there is no valid session or the account is
 * blocked — callers (API routes) should catch these and translate to
 * 401/403 responses. This is the single choke point every server-side
 * data access should go through instead of trusting any client-sent id.
 */
export async function requireUser() {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError();
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single<Profile>();

  if (!profile) {
    throw new UnauthorizedError("Perfil não encontrado.");
  }

  if (profile.status === "blocked") {
    throw new ForbiddenError("Sua conta está bloqueada. Contate o suporte.");
  }

  return { supabase, user, profile };
}

export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile.role !== "admin") {
    throw new ForbiddenError("Requer privilégios de administrador.");
  }
  return ctx;
}
