# Recebimento dos pacotes de cloud

## A ideia central

Todo o desenho parte de uma pergunta: **o que impede alguém de comprar o plano
Business por 1 centavo?**

A resposta não pode ser "o frontend não deixa". Qualquer pessoa abre o DevTools e
altera o que o navegador envia. Por isso:

- O corpo de `POST /api/checkout` aceita **apenas `planCode`**. Não existe campo
  de valor, moeda ou desconto — aceitar qualquer um seria entregar o preço ao
  cliente.
- O valor é lido da tabela `plans` no servidor e **congelado** em
  `checkout_sessions.amount_cents` antes de a Stripe ser chamada.
- A conta só vira paga por um **webhook com assinatura HMAC verificada**. A URL
  de retorno no navegador (`/settings?pagamento=sucesso`) é só uma tela: o
  usuário controla para onde o navegador navega, então ela não ativa nada.

```
navegador                servidor                      Stripe
    |                       |                            |
    |-- POST /api/checkout ->|                            |
    |   { planCode }         |-- le o preco de `plans`    |
    |                        |-- grava checkout_sessions  |
    |                        |   (preco congelado)        |
    |                        |--- cria a sessao --------->|
    |<---- url de pagamento -|<-------------------------- |
    |                                                     |
    |------------- paga na pagina da Stripe ------------->|
    |                                                     |
    |                        |<== webhook ASSINADO =======|
    |                        |    verifica HMAC           |
    |                        |    grava payment_events    |
    |                        |    ativa a assinatura      |
```

## Configuração

1. **Rode a migração 0008** (`supabase/migrations/0008_checkout.sql`).
2. No painel da Stripe → Developers → API keys, copie a **Secret key**
   (`sk_test_...` para testar) para `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint:
   - URL: `https://SEU-APP.vercel.app/api/webhooks/stripe`
   - Eventos: `checkout.session.completed` e `checkout.session.expired`
4. Copie o **Signing secret** (`whsec_...`) para `STRIPE_WEBHOOK_SECRET`.
5. Na Vercel, as duas variáveis são do tipo **Secret**. Redeploy.

> **Nunca** prefixe essas variáveis com `NEXT_PUBLIC_`. Esse prefixo embute o
> valor no bundle do navegador, e qualquer visitante passaria a poder cobrar em
> seu nome e a forjar webhooks.

## Decisões de segurança

**Preço autoritativo no servidor.** Descrito acima. É a defesa principal.

**Verificação de assinatura.** `verifyStripeWebhook` recalcula o HMAC-SHA256 de
`${timestamp}.${corpo bruto}` sob o webhook secret e compara em tempo constante.
O corpo é lido com `request.text()` antes de qualquer parsing — reserializar o
JSON reordenaria as chaves e a assinatura deixaria de bater.

**Proteção contra replay.** Um corpo capturado tem assinatura válida para sempre;
só o timestamp o denuncia. Eventos fora de uma janela de 5 minutos são rejeitados.

**Idempotência.** A Stripe reenvia o mesmo evento por horas até receber 2xx. O
handler grava em `payment_events` **antes** de aplicar qualquer efeito; a
constraint única `(provider, provider_event_id)` faz o reenvio colidir e parar.
Sem isso, cada reenvio criaria outra assinatura paga.

**Ativação atômica.** `activate_subscription_from_checkout` faz tudo numa
transação Postgres: registra o pagamento, encerra a assinatura anterior, cria a
nova, emite a fatura e ajusta a cota. Feito em SQL e não no route handler porque
uma falha no meio deixaria o usuário pago sem plano, ou com duas assinaturas
ativas.

**`payment_status` conferido.** Uma sessão pode completar sem o pagamento
liquidar. O handler exige `payment_status === "paid"`, não apenas a chegada do
evento.

**RLS.** `checkout_sessions` é legível pelo dono; `payment_events` só por admin.
Nenhuma das duas tem policy de escrita para `authenticated` — um usuário não
consegue forjar uma sessão com preço próprio nem marcar um pagamento como pago
pelo cliente Supabase. `payments` e `invoices` tiveram a escrita restrita a admin
de forma explícita.

**Idempotency-Key na Stripe.** Um retry de rede na criação da sessão geraria um
segundo link de pagamento para o mesmo pedido; a chave evita isso.

## Por que não o SDK da Stripe

A verificação de assinatura é a única coisa que separa um webhook legítimo de
qualquer pessoa que descubra a URL do endpoint. Implementá-la de forma explícita
e testada vale mais do que economizar vinte linhas, e evita arrastar o SDK
inteiro quando o resto da integração são duas chamadas HTTP.

O verificador tem 17 casos de teste cobrindo assinatura válida, corpo adulterado,
segredo errado, replay (passado e futuro), header ausente ou malformado, rotação
de segredo com múltiplos `v1`, assinatura truncada e os limites exatos da janela.

## Testando

A Stripe CLI encaminha eventos reais para o seu ambiente local:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```

O `whsec_` que o `stripe listen` imprime é o que vale localmente — é diferente do
segredo do endpoint de produção.

## O que falta

O fluxo cobre pagamento avulso (`mode: payment`) com período de 30 dias. Cobrança
recorrente de verdade (`mode: subscription`, com renovação automática e os
eventos `invoice.paid` / `customer.subscription.deleted`) ainda não está
implementada — a renovação hoje exige um novo checkout.
