import "server-only";

import {
  PaymentUserError,
  type InitiateParams,
  type PaymentAdapter,
  type RedirectResult,
} from "@/lib/services/payment-adapter";

/**
 * Cartao (Visa/Mastercard) via adquirente.
 *
 * ESTADO: aguardando definicao do adquirente.
 *
 * A Stripe nao aceita empresas residentes em Mocambique, entao a
 * adquirencia de cartao passa por um banco local (BCI, Millennium BIM,
 * Standard Bank) ou por um agregador regional. Cada um tem a sua API, e
 * a escolha ainda nao foi feita.
 *
 * O fluxo, porem, e sempre o mesmo e ja esta modelado: cria-se uma
 * sessao no adquirente e redireciona-se o navegador para a pagina de
 * pagamento dele. Por isso este adaptador devolve `RedirectResult` — o
 * mesmo tipo que a Stripe devolvia. Trocar de adquirente e reescrever
 * `initiate`, nada mais.
 *
 * PARA COMPLETAR, sao precisos:
 *   1. Qual adquirente (banco ou agregador)
 *   2. Endpoint de criacao da sessao de pagamento e autenticacao
 *   3. Como o retorno chega: callback assinado? consulta de estado?
 *   4. Se a assinatura do callback e HMAC, qual o esquema exato
 *
 * O verificador de assinatura ja escrito em `stripe.ts` serve de
 * referencia: se o adquirente usar HMAC-SHA256 sobre o corpo bruto, a
 * mesma logica (comparacao em tempo constante, janela de tolerancia
 * contra replay) se aplica diretamente.
 */

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

export const cardAdapter: PaymentAdapter = {
  method: "card",
  provider: "card",

  isConfigured() {
    return Boolean(env("CARD_ACQUIRER_URL") && env("CARD_ACQUIRER_KEY") && env("CARD_MERCHANT_ID"));
  },

  async initiate(_params: InitiateParams): Promise<RedirectResult> {
    throw new PaymentUserError(
      "Pagamento por cartao ainda nao esta disponivel. Use M-Pesa."
    );
  },
};
