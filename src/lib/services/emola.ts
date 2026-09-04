import "server-only";

import {
  PaymentUserError,
  type InitiateParams,
  type PaymentAdapter,
  type PushResult,
} from "@/lib/services/payment-adapter";

/**
 * e-Mola (Movitel) — cobranca em carteira movel.
 *
 * ESTADO: aguardando documentacao.
 *
 * A Movitel nao publica a API da e-Mola abertamente; o acesso vem com o
 * contrato de comerciante. Sem a documentacao, escrever o corpo da
 * requisicao seria adivinhar nomes de campo — codigo que parece pronto e
 * falha na integracao, que e pior do que ausencia.
 *
 * Entao este adaptador e honesto: enquanto as credenciais nao existirem,
 * `isConfigured()` devolve false e o metodo simplesmente nao aparece
 * para o cliente. Nada quebra, e nada finge funcionar.
 *
 * PARA COMPLETAR, sao precisos da documentacao da Movitel:
 *   1. URL base e caminho do endpoint de cobranca C2B
 *   2. Esquema de autenticacao (token estatico? OAuth? assinatura?)
 *   3. Nomes dos campos de: numero do pagador, valor, referencia
 *   4. Como o sucesso e sinalizado (codigo proprio, como o INS-0 do M-Pesa?)
 *   5. Formato do callback de confirmacao e como valida-lo
 *
 * Com isso, o adaptador fica igual ao de `mpesa.ts` — a interface ja
 * cobre o fluxo de push, entao so o corpo de `initiate` muda.
 */

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

export const emolaAdapter: PaymentAdapter = {
  method: "emola",
  provider: "emola",

  isConfigured() {
    return Boolean(env("EMOLA_API_URL") && env("EMOLA_API_KEY") && env("EMOLA_MERCHANT_ID"));
  },

  async initiate(_params: InitiateParams): Promise<PushResult> {
    // Alcancavel apenas se alguem configurar as variaveis sem completar
    // a implementacao. Falhar aqui, explicitamente, e melhor do que
    // enviar uma requisicao inventada ao operador.
    throw new PaymentUserError(
      "Pagamento por e-Mola ainda nao esta disponivel. Use M-Pesa ou cartao."
    );
  },
};
