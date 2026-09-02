import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Adaptador Stripe.
 *
 * A verificacao de assinatura e implementada aqui em vez de usar
 * `stripe.webhooks.constructEvent` por uma razao: e a unica coisa que
 * separa um webhook legitimo de qualquer pessoa que descubra a URL do
 * endpoint. Deixa-la explicita e testada vale mais do que economizar
 * vinte linhas, e evita arrastar o SDK inteiro para o bundle do servidor
 * quando o resto da integracao sao duas chamadas HTTP.
 *
 * O esquema da Stripe: o header `Stripe-Signature` traz
 *   t=<unix>,v1=<hmac hex>[,v1=<outro>]
 * e a assinatura cobre `${t}.${corpo bruto}` com HMAC-SHA256 sob o
 * webhook secret. Podem vir varios `v1` durante uma rotacao de segredo.
 */

export class StripeSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeSignatureError";
  }
}

/** Janela de tolerancia do timestamp. Fora dela, e replay. */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

interface ParsedSignature {
  timestamp: number;
  signatures: string[];
}

function parseSignatureHeader(header: string): ParsedSignature {
  let timestamp = -1;
  const signatures: string[] = [];

  for (const part of header.split(",")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key === "t") {
      timestamp = Number.parseInt(value, 10);
    } else if (key === "v1") {
      signatures.push(value);
    }
  }

  if (!Number.isFinite(timestamp) || timestamp < 0) {
    throw new StripeSignatureError("Header de assinatura sem timestamp valido.");
  }
  if (signatures.length === 0) {
    throw new StripeSignatureError("Header de assinatura sem assinatura v1.");
  }
  return { timestamp, signatures };
}

/** Compara em tempo constante; comprimentos diferentes nunca sao iguais. */
function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Valida o webhook e devolve o evento ja parseado.
 *
 * `rawBody` precisa ser o corpo EXATO recebido, byte a byte. Reserializar
 * o JSON (`JSON.stringify(await req.json())`) reordena chaves e muda o
 * espacamento, e a assinatura deixa de bater — por isso a rota le
 * `await request.text()` antes de qualquer parsing.
 */
export function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): { id: string; type: string; data: { object: Record<string, unknown> } } {
  if (!signatureHeader) {
    throw new StripeSignatureError("Requisicao sem header Stripe-Signature.");
  }
  if (!secret) {
    throw new StripeSignatureError("STRIPE_WEBHOOK_SECRET nao configurado.");
  }

  const { timestamp, signatures } = parseSignatureHeader(signatureHeader);

  // Rejeita antes de comparar: um corpo capturado e reenviado depois tem
  // assinatura valida, e so o timestamp o denuncia.
  const age = nowSeconds - timestamp;
  if (Math.abs(age) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new StripeSignatureError(
      `Timestamp fora da janela de tolerancia (${age}s).`
    );
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex");

  if (!signatures.some((candidate) => safeEquals(candidate, expected))) {
    throw new StripeSignatureError("Assinatura do webhook nao confere.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    throw new StripeSignatureError("Corpo do webhook nao e JSON valido.");
  }

  const event = parsed as { id?: unknown; type?: unknown; data?: unknown };
  if (typeof event.id !== "string" || typeof event.type !== "string") {
    throw new StripeSignatureError("Evento sem id ou type.");
  }

  return event as { id: string; type: string; data: { object: Record<string, unknown> } };
}

// ---------------------------------------------------------------------
// Criacao da sessao de checkout
// ---------------------------------------------------------------------

function stripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY nao configurado.");
  }
  return key;
}

/**
 * Cria a sessao na Stripe. O valor vem de `amountCents`, que a rota
 * leu da tabela `plans` — nunca do corpo da requisicao.
 */
export async function createStripeCheckoutSession(params: {
  amountCents: number;
  currency: string;
  productName: string;
  successUrl: string;
  cancelUrl: string;
  clientReferenceId: string;
  customerEmail?: string;
}): Promise<{ id: string; url: string }> {
  const form = new URLSearchParams();
  form.set("mode", "payment");
  form.set("success_url", params.successUrl);
  form.set("cancel_url", params.cancelUrl);
  form.set("client_reference_id", params.clientReferenceId);
  form.set("line_items[0][quantity]", "1");
  form.set("line_items[0][price_data][currency]", params.currency.toLowerCase());
  form.set("line_items[0][price_data][unit_amount]", String(params.amountCents));
  form.set("line_items[0][price_data][product_data][name]", params.productName);
  if (params.customerEmail) {
    form.set("customer_email", params.customerEmail);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Sem isto, um retry de rede criaria uma segunda sessao (e um
      // segundo link de pagamento) para o mesmo pedido.
      "Idempotency-Key": params.clientReferenceId,
    },
    body: form.toString(),
  });

  const json = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };

  if (!res.ok || !json.id || !json.url) {
    throw new Error(json.error?.message ?? "Falha ao criar a sessao de pagamento.");
  }
  return { id: json.id, url: json.url };
}
