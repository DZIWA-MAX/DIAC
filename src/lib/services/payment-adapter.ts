import "server-only";

import type { Plan } from "@/types/database";

/**
 * Contrato que todo metodo de pagamento cumpre.
 *
 * O ponto que a interface existe para capturar: cartao e dinheiro movel
 * terminam de formas diferentes. Cartao devolve uma URL para onde
 * mandar o navegador; M-Pesa e e-Mola nao devolvem URL nenhuma — o
 * cliente aprova no telemovel e a confirmacao chega depois, por
 * callback. Um tipo unico com `url` opcional esconderia isso e levaria
 * a UI a redirecionar para `undefined`.
 */

export type PaymentMethod = "mpesa" | "emola" | "card";

/** Cartao: leve o navegador para ca. */
export interface RedirectResult {
  kind: "redirect";
  url: string;
  providerSessionId: string;
}

/**
 * Dinheiro movel: o pedido foi enviado ao telemovel do cliente. Nao ha
 * para onde navegar; a UI mostra "confirme no seu telemovel" e espera a
 * confirmacao chegar.
 */
export interface PushResult {
  kind: "push";
  /** Referencia do operador, para conciliacao e para o callback casar. */
  providerReference: string;
  /** Texto pronto para exibir, ja no idioma do utilizador. */
  message: string;
}

export type InitiateResult = RedirectResult | PushResult;

export interface InitiateParams {
  /** Valor em centavos, vindo da sessao — nunca do cliente. */
  amountCents: number;
  currency: string;
  plan: Plan;
  /** Id interno da checkout_session; e a chave de conciliacao. */
  checkoutSessionId: string;
  /** So para dinheiro movel, ja normalizado como 258XXXXXXXXX. */
  msisdn?: string;
  customerEmail?: string;
  appUrl: string;
}

export interface PaymentAdapter {
  readonly method: PaymentMethod;
  readonly provider: string;
  /** Se falta configuracao (chaves, credenciais), o metodo nao e oferecido. */
  isConfigured(): boolean;
  initiate(params: InitiateParams): Promise<InitiateResult>;
}

/**
 * Erro que o utilizador pode ler. Distinguido de falhas internas para a
 * rota saber o que mostrar e o que engolir — a mensagem de um erro
 * interno de operador nao deve chegar ao cliente.
 */
export class PaymentUserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentUserError";
  }
}

/**
 * Converte centavos para a unidade decimal que os operadores de dinheiro
 * movel esperam. O M-Pesa recebe "10.50", nao 1050 — mandar centavos
 * cobraria cem vezes o valor, que e o tipo de erro que so aparece em
 * producao e com dinheiro real.
 */
export function centsToDecimalString(amountCents: number): string {
  return (amountCents / 100).toFixed(2);
}
