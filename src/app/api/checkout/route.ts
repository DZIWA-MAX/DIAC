import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, rateLimit } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";
import {
  attachProviderSession,
  createCheckoutSession,
  resolvePayablePlan,
} from "@/lib/services/payments";
import { createStripeCheckoutSession } from "@/lib/services/stripe";

/**
 * Inicia o pagamento de um pacote de cloud.
 *
 * O corpo aceita SOMENTE o codigo do plano. Nao ha campo de valor, de
 * moeda nem de desconto: aceitar qualquer um deles seria deixar o preco
 * na mao do cliente. O valor sai da tabela `plans` e fica congelado na
 * linha de checkout_sessions antes de a Stripe ser chamada.
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireUser();

    // Cada sessao cria um objeto na Stripe; sem limite, um laco no
    // navegador enche a conta de sessoes pendentes.
    if (!rateLimit(`checkout:${user.id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas de pagamento. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const planCode = (body as { planCode?: unknown }).planCode;
    if (typeof planCode !== "string" || planCode.length === 0) {
      return NextResponse.json({ error: "Plano nao informado." }, { status: 400 });
    }

    const plan = await resolvePayablePlan(planCode);
    const session = await createCheckoutSession({
      userId: user.id,
      plan,
      provider: "stripe",
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL nao configurado.");
    }

    const stripeSession = await createStripeCheckoutSession({
      amountCents: session.amount_cents,
      currency: session.currency,
      productName: `NuvemX ${plan.name}`,
      // O id interno vai no client_reference_id para o webhook reencontrar
      // a sessao sem confiar em nada que venha da URL de retorno.
      clientReferenceId: session.id,
      successUrl: `${appUrl}/settings?pagamento=sucesso`,
      cancelUrl: `${appUrl}/plans?pagamento=cancelado`,
      customerEmail: user.email ?? undefined,
    });

    await attachProviderSession(session.id, stripeSession.id);

    await logSecurityEvent({
      userId: user.id,
      action: "checkout.session_create",
      metadata: {
        checkoutSessionId: session.id,
        planCode: plan.code,
        amountCents: session.amount_cents,
        currency: session.currency,
        currentPlanId: profile.plan_id,
      },
    });

    return NextResponse.json({ url: stripeSession.url });
  } catch (error) {
    return handleApiError(error);
  }
}
