import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, rateLimit } from "@/lib/api-utils";
import { logSecurityEvent } from "@/lib/services/security";
import {
  attachProviderSession,
  createCheckoutSession,
  resolvePayablePlan,
} from "@/lib/services/payments";
import { PaymentUserError } from "@/lib/services/payment-adapter";
import { MsisdnError, requireMsisdnFor } from "@/lib/services/msisdn";
import {
  adapterFor,
  availableMethodsFor,
  isPaymentMethod,
} from "@/lib/services/payment-registry";

/**
 * Inicia o pagamento de um pacote de cloud.
 *
 * O corpo aceita o codigo do plano, o metodo e — para dinheiro movel — o
 * numero de telemovel. Continua sem qualquer campo de valor, moeda ou
 * desconto: o preco sai da tabela `plans` no servidor e fica congelado
 * na sessao antes de o operador ser chamado.
 *
 * A resposta tem duas formas, porque os fluxos sao diferentes:
 *   cartao -> { kind: "redirect", url }   leve o navegador para la
 *   movel  -> { kind: "push", message }   o cliente confirma no telemovel
 */
export async function POST(request: Request) {
  try {
    const { user, profile } = await requireUser();

    if (!rateLimit(`checkout:${user.id}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas de pagamento. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { planCode, method, msisdn } = body as {
      planCode?: unknown;
      method?: unknown;
      msisdn?: unknown;
    };

    if (typeof planCode !== "string" || planCode.length === 0) {
      return NextResponse.json({ error: "Plano não informado." }, { status: 400 });
    }
    if (!isPaymentMethod(method)) {
      return NextResponse.json({ error: "Método de pagamento inválido." }, { status: 400 });
    }

    const plan = await resolvePayablePlan(planCode);

    // O metodo tem de estar habilitado no plano E configurado no servidor.
    // Verificado aqui e nao so na UI: a UI esconde a opcao, mas quem
    // chama a API direto tem de bater na mesma parede.
    if (!availableMethodsFor(plan).includes(method)) {
      return NextResponse.json(
        { error: "Este método de pagamento não está disponível para o plano escolhido." },
        { status: 400 }
      );
    }

    // Dinheiro movel exige numero, e o numero tem de bater com a
    // operadora da carteira — M-Pesa e Vodacom, e-Mola e Movitel.
    let normalizedMsisdn: string | undefined;
    if (method === "mpesa" || method === "emola") {
      normalizedMsisdn = requireMsisdnFor(method, msisdn);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      throw new Error("NEXT_PUBLIC_APP_URL não configurado.");
    }

    const adapter = adapterFor(method);
    const session = await createCheckoutSession({
      userId: user.id,
      plan,
      provider: adapter.provider,
      method,
      msisdn: normalizedMsisdn,
    });

    const result = await adapter.initiate({
      amountCents: session.amount_cents,
      currency: session.currency,
      plan,
      checkoutSessionId: session.id,
      msisdn: normalizedMsisdn,
      customerEmail: user.email ?? undefined,
      appUrl,
    });

    await attachProviderSession(
      session.id,
      result.kind === "redirect" ? result.providerSessionId : result.providerReference,
      result.kind === "push" ? result.providerReference : undefined
    );

    await logSecurityEvent({
      userId: user.id,
      action: "checkout.session_create",
      metadata: {
        checkoutSessionId: session.id,
        planCode: plan.code,
        method,
        amountCents: session.amount_cents,
        currency: session.currency,
        currentPlanId: profile.plan_id,
      },
    });

    return NextResponse.json(
      result.kind === "redirect"
        ? { kind: "redirect", url: result.url }
        : { kind: "push", message: result.message }
    );
  } catch (error) {
    // Erros que o cliente consegue agir viram 400 com a mensagem real;
    // o resto passa pelo tratamento padrao, que nao vaza detalhe interno.
    if (error instanceof MsisdnError || error instanceof PaymentUserError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
