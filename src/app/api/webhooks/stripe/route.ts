import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";
import {
  completeCheckout,
  findSessionByProviderId,
  markSessionCanceled,
  recordPaymentEvent,
} from "@/lib/services/payments";
import { StripeSignatureError, verifyStripeWebhook } from "@/lib/services/stripe";

/**
 * Confirmacao de pagamento vinda da Stripe.
 *
 * Este endpoint e publico por necessidade — quem chama e a Stripe, sem
 * sessao de usuario. O que o protege e a assinatura HMAC do corpo: sem
 * ela, qualquer pessoa que descubra a URL ativaria assinaturas de graca.
 * Por isso a verificacao acontece antes de qualquer leitura do conteudo.
 *
 * A URL de retorno do navegador (`/settings?pagamento=sucesso`) NAO
 * ativa nada: e so uma tela. O usuario controla para onde o navegador
 * navega; so o webhook assinado muda o estado da conta.
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ip = getClientIp(request);

  // Corpo bruto, byte a byte: reserializar o JSON quebraria o HMAC.
  const rawBody = await request.text();

  let event;
  try {
    event = verifyStripeWebhook(
      rawBody,
      request.headers.get("stripe-signature"),
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (error) {
    if (error instanceof StripeSignatureError) {
      await logSecurityEvent({
        userId: null,
        action: "payment.webhook_rejected",
        metadata: { reason: error.message },
        ipAddress: ip,
        userAgent: request.headers.get("user-agent"),
      });
      // 400, nunca detalhando o motivo na resposta: quem esta sondando
      // o endpoint nao deve aprender o que faltou na tentativa.
      return NextResponse.json({ error: "Assinatura invalida." }, { status: 400 });
    }
    return NextResponse.json({ error: "Falha ao processar." }, { status: 400 });
  }

  try {
    // Grava o evento antes de agir. Se ja existia, a Stripe esta
    // reenviando: responde 200 para ela parar, sem repetir o efeito.
    const isNew = await recordPaymentEvent({
      provider: "stripe",
      eventId: event.id,
      eventType: event.type,
      payload: event as unknown,
    });
    if (!isNew) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const object = event.data?.object ?? {};
    const providerSessionId = typeof object.id === "string" ? object.id : null;

    switch (event.type) {
      case "checkout.session.completed": {
        // Confia no payment_status da Stripe, nao no fato de o evento ter
        // chegado: uma sessao pode completar sem o pagamento liquidar.
        if (object.payment_status !== "paid") {
          return NextResponse.json({ received: true, ignored: "nao pago" });
        }
        if (!providerSessionId) break;

        const session = await findSessionByProviderId(providerSessionId);
        if (!session) {
          // Evento de outra conta ou de um ambiente diferente apontando
          // para a mesma URL. Registra e ignora.
          await logSecurityEvent({
            userId: null,
            action: "payment.webhook_unknown_session",
            metadata: { providerSessionId, eventId: event.id },
            ipAddress: ip,
          });
          break;
        }

        const paymentId =
          typeof object.payment_intent === "string" ? object.payment_intent : event.id;

        const subscriptionId = await completeCheckout({
          checkoutSessionId: session.id,
          providerPaymentId: paymentId,
        });

        await logSecurityEvent({
          userId: session.user_id,
          action: "payment.confirmed",
          metadata: {
            checkoutSessionId: session.id,
            subscriptionId,
            amountCents: session.amount_cents,
            currency: session.currency,
            eventId: event.id,
          },
          ipAddress: ip,
        });
        break;
      }

      case "checkout.session.expired": {
        if (providerSessionId) await markSessionCanceled(providerSessionId);
        break;
      }

      default:
        // Eventos que nao nos dizem respeito ainda contam como recebidos.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    // 500 de proposito: a Stripe reenvia, e a guarda de idempotencia
    // garante que o reenvio nao duplique o que ja tiver sido aplicado.
    console.error("Falha ao processar webhook da Stripe", error);
    return NextResponse.json({ error: "Erro ao processar evento." }, { status: 500 });
  }
}
