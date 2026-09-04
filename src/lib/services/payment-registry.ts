import "server-only";

import { cardAdapter } from "@/lib/services/card";
import { emolaAdapter } from "@/lib/services/emola";
import { mpesaAdapter } from "@/lib/services/mpesa";
import type { PaymentAdapter, PaymentMethod } from "@/lib/services/payment-adapter";
import type { Plan } from "@/types/database";

const ADAPTERS: Record<PaymentMethod, PaymentAdapter> = {
  mpesa: mpesaAdapter,
  emola: emolaAdapter,
  card: cardAdapter,
};

export function adapterFor(method: PaymentMethod): PaymentAdapter {
  return ADAPTERS[method];
}

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === "mpesa" || value === "emola" || value === "card";
}

/**
 * Metodos que o cliente pode realmente escolher agora.
 *
 * Dois filtros, e ambos importam: o plano precisa aceitar o metodo
 * (coluna `payment_methods`, para desligar um sem mexer em codigo), e o
 * adaptador precisa estar configurado. Oferecer um metodo sem
 * credenciais leva o cliente ate ao fim do formulario para so entao
 * falhar — melhor nao o mostrar.
 */
export function availableMethodsFor(plan: Plan): PaymentMethod[] {
  const allowed = (plan.payment_methods ?? []) as PaymentMethod[];
  return allowed.filter((m) => isPaymentMethod(m) && ADAPTERS[m].isConfigured());
}

/** Rotulos para a interface. */
export const METHOD_LABELS: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  card: "Cartão Visa/Mastercard",
};
