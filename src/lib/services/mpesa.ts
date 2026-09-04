import "server-only";

import { constants, publicEncrypt, randomUUID } from "crypto";
import {
  centsToDecimalString,
  PaymentUserError,
  type InitiateParams,
  type PaymentAdapter,
  type PushResult,
} from "@/lib/services/payment-adapter";

/**
 * M-Pesa Mocambique (Vodacom) — cobranca C2B.
 *
 * ATENCAO AO INTEGRAR
 * -------------------
 * As constantes marcadas com "CONFERIR" abaixo foram escritas sem acesso
 * ao portal da Vodacom e precisam ser validadas contra a documentacao da
 * sua conta antes do primeiro pagamento real. Ficam isoladas aqui de
 * proposito: corrigi-las e editar uma linha, nao reescrever o adaptador.
 *
 * O que NAO precisa de conferencia e o esquema de autenticacao, que e
 * incomum e esta implementado e testado: o Bearer nao e a sua API key.
 * E a API key CIFRADA com a chave publica da Vodacom (RSA PKCS#1 v1.5),
 * em base64. Cada requisicao carrega esse valor.
 */

// --- CONFERIR no portal da Vodacom -----------------------------------
const API_HOST = process.env.MPESA_API_HOST ?? "api.vm.co.mz";
const API_PORT = process.env.MPESA_API_PORT ?? "18352";
const C2B_PATH =
  process.env.MPESA_C2B_PATH ?? "/ipg/v1x/c2bPayment/singleStage/";
// ---------------------------------------------------------------------

function env(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

/**
 * Monta o token de sessao.
 *
 * A chave publica vem do portal em base64 DER (SPKI), sem o cabecalho
 * PEM. Reconstituimos o PEM porque `publicEncrypt` do Node so aceita
 * essa forma. O padding e PKCS#1 v1.5, nao OAEP — a Vodacom rejeita OAEP,
 * e o erro que devolve nao diz isso.
 */
export function buildMpesaBearer(apiKey: string, publicKeyBase64: string): string {
  const body = publicKeyBase64.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  const pem = `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----\n`;

  const encrypted = publicEncrypt(
    { key: pem, padding: constants.RSA_PKCS1_PADDING },
    Buffer.from(apiKey, "utf8")
  );
  return encrypted.toString("base64");
}

/**
 * Referencia da transacao enviada ao operador.
 *
 * O M-Pesa limita este campo e rejeita caracteres fora de
 * [A-Za-z0-9]; um UUID com hifens e recusado. Usamos os primeiros 12
 * caracteres do hex do id da sessao, que continua unico o suficiente
 * para conciliar e cabe no limite.
 */
export function transactionReference(checkoutSessionId: string): string {
  const compact = checkoutSessionId.replace(/-/g, "").toUpperCase();
  return `NX${compact.slice(0, 12)}`;
}

export const mpesaAdapter: PaymentAdapter = {
  method: "mpesa",
  provider: "mpesa",

  isConfigured() {
    return Boolean(
      env("MPESA_API_KEY") && env("MPESA_PUBLIC_KEY") && env("MPESA_SERVICE_PROVIDER_CODE")
    );
  },

  async initiate(params: InitiateParams): Promise<PushResult> {
    const apiKey = env("MPESA_API_KEY");
    const publicKey = env("MPESA_PUBLIC_KEY");
    const serviceProviderCode = env("MPESA_SERVICE_PROVIDER_CODE");

    if (!apiKey || !publicKey || !serviceProviderCode) {
      // Erro interno, nao do utilizador: e configuracao em falta.
      throw new Error("M-Pesa nao configurado (MPESA_API_KEY/PUBLIC_KEY/SERVICE_PROVIDER_CODE).");
    }
    if (!params.msisdn) {
      throw new PaymentUserError("Informe o numero de telemovel para pagar com M-Pesa.");
    }

    const reference = transactionReference(params.checkoutSessionId);

    const res = await fetch(`https://${API_HOST}:${API_PORT}${C2B_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${buildMpesaBearer(apiKey, publicKey)}`,
        Origin: params.appUrl,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input_TransactionReference: reference,
        input_CustomerMSISDN: params.msisdn,
        // Valor em unidade decimal, NAO em centavos.
        input_Amount: centsToDecimalString(params.amountCents),
        input_ThirdPartyReference: randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase(),
        input_ServiceProviderCode: serviceProviderCode,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      output_ResponseCode?: string;
      output_ResponseDesc?: string;
      output_TransactionID?: string;
      output_ConversationID?: string;
    };

    // INS-0 e o codigo de sucesso do M-Pesa. Qualquer outro e falha, e o
    // HTTP pode vir 200 mesmo assim — por isso o codigo manda, nao o status.
    if (json.output_ResponseCode !== "INS-0") {
      const desc = json.output_ResponseDesc ?? "";
      // Erros que o cliente consegue resolver sao repassados; o resto
      // vira mensagem generica para nao vazar detalhe de integracao.
      if (/insufficient|saldo/i.test(desc)) {
        throw new PaymentUserError("Saldo insuficiente na sua conta M-Pesa.");
      }
      if (/subscriber|msisdn|customer/i.test(desc)) {
        throw new PaymentUserError("Numero nao registado no M-Pesa.");
      }
      console.error("M-Pesa recusou a cobranca", {
        code: json.output_ResponseCode,
        desc,
        reference,
      });
      throw new PaymentUserError(
        "Nao foi possivel iniciar o pagamento por M-Pesa. Tente novamente."
      );
    }

    return {
      kind: "push",
      providerReference: json.output_TransactionID ?? reference,
      message:
        "Pedido enviado. Confirme o pagamento no seu telemovel digitando o PIN do M-Pesa.",
    };
  },
};
