import "server-only";

import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { Plan } from "@/types/database";

/**
 * Nucleo do recebimento, independente de provedor.
 *
 * A regra que sustenta tudo: o preco e sempre lido da tabela `plans` no
 * servidor. O cliente manda o codigo do plano, nunca um valor. Sem isso,
 * qualquer pessoa abre o DevTools e compra o plano Business por 1 centavo.
 */

export type PaymentProvider = "stripe";

export interface CheckoutSession {
  id: string;
  user_id: string;
  plan_id: string;
  amount_cents: number;
  currency: string;
  provider: string;
  provider_session_id: string | null;
  status: "pending" | "completed" | "expired" | "canceled";
  expires_at: string;
  completed_at: string | null;
  created_at: string;
}

/** Quanto tempo a assinatura vale a partir da confirmacao do pagamento. */
const PERIOD_DAYS = 30;

export function periodEndFromNow(days = PERIOD_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Resolve o plano a cobrar. Rejeita plano inativo e o gratuito — nao ha
 * o que cobrar por um plano de preco zero, e deixar passar criaria uma
 * sessao de checkout de 0 centavos que o provedor recusa de qualquer
 * forma, so que mais tarde e com uma mensagem pior.
 */
export async function resolvePayablePlan(planCode: string): Promise<Plan> {
  const admin = createAdminSupabaseClient();
  const { data: plan, error } = await admin
    .from("plans")
    .select("*")
    .eq("code", planCode)
    .eq("active", true)
    .maybeSingle<Plan>();

  if (error) throw error;
  if (!plan) {
    throw new Error("Plano nao encontrado ou indisponivel.");
  }
  if (plan.price_cents <= 0) {
    throw new Error("Este plano nao requer pagamento.");
  }
  return plan;
}

/** Cria a sessao com o preco ja congelado, antes de falar com o provedor. */
export async function createCheckoutSession(params: {
  userId: string;
  plan: Plan;
  provider: PaymentProvider;
}): Promise<CheckoutSession> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("checkout_sessions")
    .insert({
      user_id: params.userId,
      plan_id: params.plan.id,
      amount_cents: params.plan.price_cents,
      currency: params.plan.currency,
      provider: params.provider,
    })
    .select("*")
    .single<CheckoutSession>();

  if (error) throw error;
  return data;
}

export async function attachProviderSession(
  sessionId: string,
  providerSessionId: string
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("checkout_sessions")
    .update({ provider_session_id: providerSessionId })
    .eq("id", sessionId);
  if (error) throw error;
}

/**
 * Registra o evento antes de aplicar qualquer efeito.
 *
 * Devolve false quando o evento ja tinha sido processado — a colisao na
 * constraint unica (provider, provider_event_id) e o mecanismo de
 * idempotencia. A Stripe reenvia o mesmo evento por horas ate receber
 * 2xx; sem esta guarda, cada reenvio criaria outra assinatura paga.
 */
export async function recordPaymentEvent(params: {
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  payload: unknown;
}): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("payment_events").insert({
    provider: params.provider,
    provider_event_id: params.eventId,
    event_type: params.eventType,
    payload: params.payload as Record<string, unknown>,
  });

  if (error) {
    // 23505 = unique_violation: ja processado, nao e falha.
    if ((error as { code?: string }).code === "23505") return false;
    throw error;
  }
  return true;
}

/**
 * Confirma o pagamento. Toda a escrita acontece dentro da funcao
 * Postgres, numa transacao: ou o usuario fica pago, com assinatura,
 * fatura e cota novas, ou nada muda.
 */
export async function completeCheckout(params: {
  checkoutSessionId: string;
  providerPaymentId: string;
  periodEnd?: string;
}): Promise<string> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("activate_subscription_from_checkout", {
    p_session_id: params.checkoutSessionId,
    p_provider_payment_id: params.providerPaymentId,
    p_period_end: params.periodEnd ?? periodEndFromNow(),
  });

  if (error) throw error;
  return data as string;
}

/** Localiza a sessao interna a partir do id que o provedor devolveu. */
export async function findSessionByProviderId(
  providerSessionId: string
): Promise<CheckoutSession | null> {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("checkout_sessions")
    .select("*")
    .eq("provider_session_id", providerSessionId)
    .maybeSingle<CheckoutSession>();
  return data ?? null;
}

export async function markSessionCanceled(providerSessionId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin
    .from("checkout_sessions")
    .update({ status: "canceled" })
    .eq("provider_session_id", providerSessionId)
    .eq("status", "pending");
}
