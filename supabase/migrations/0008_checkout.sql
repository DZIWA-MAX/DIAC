-- =====================================================================
-- Recebimento seguro dos pacotes de cloud.
--
-- O schema de 0001 ja tem subscriptions/payments/invoices. Falta o que
-- torna o recebimento *seguro*, e e isso que esta migracao adiciona:
--
--   * checkout_sessions -- o pedido de pagamento, com o preco congelado
--     no servidor no momento em que a sessao e criada. O cliente nunca
--     envia um valor; ele envia so o codigo do plano.
--
--   * payment_events -- toda notificacao de provedor ja processada,
--     unica pelo id do evento. E o que impede que um webhook reenviado
--     (a Stripe reenvia por horas ate receber 2xx) credite duas vezes.
--
-- Nada aqui e gravavel pelo navegador: um pagamento so vira assinatura
-- ativa por um webhook cuja assinatura HMAC foi verificada no servidor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- checkout_sessions -- o preco autoritativo vive aqui
-- ---------------------------------------------------------------------
create table if not exists public.checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id),

  -- Copia do preco do plano no instante da criacao. Guardar em vez de
  -- reler na confirmacao evita que uma alteracao de tabela de precos no
  -- meio do checkout cobre um valor diferente do que foi mostrado.
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null,

  provider text not null,
  provider_session_id text unique,

  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired', 'canceled')),

  -- Sessao pendente morre sozinha; sem isso um link de pagamento antigo
  -- continuaria valido indefinidamente.
  expires_at timestamptz not null default (now() + interval '1 hour'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists checkout_sessions_user_id_idx on public.checkout_sessions (user_id);
create index if not exists checkout_sessions_status_idx on public.checkout_sessions (status);
create index if not exists checkout_sessions_provider_session_idx
  on public.checkout_sessions (provider_session_id);

drop trigger if exists set_updated_at on public.checkout_sessions;
create trigger set_updated_at before update on public.checkout_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- payment_events -- idempotencia dos webhooks
--
-- A unicidade de (provider, provider_event_id) e a defesa: o handler
-- insere ANTES de aplicar qualquer efeito, entao um reenvio colide na
-- constraint e para ali. Sem isso, a Stripe reenviando o mesmo
-- `checkout.session.completed` criaria uma segunda assinatura paga.
-- ---------------------------------------------------------------------
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index if not exists payment_events_type_idx on public.payment_events (event_type);
create index if not exists payment_events_processed_idx
  on public.payment_events (processed_at desc);

-- ---------------------------------------------------------------------
-- RLS
--
-- Leitura: o dono ve o que e dele, admin ve tudo.
-- Escrita: ninguem, exceto o service role (que ignora RLS por natureza).
-- Sem policy de INSERT/UPDATE/DELETE para `authenticated`, um usuario
-- nao consegue forjar uma sessao de checkout com preco proprio nem
-- marcar um pagamento como pago pelo cliente Supabase.
-- ---------------------------------------------------------------------
alter table public.checkout_sessions enable row level security;
alter table public.payment_events enable row level security;

drop policy if exists "checkout_sessions_select_own_or_admin" on public.checkout_sessions;
create policy "checkout_sessions_select_own_or_admin" on public.checkout_sessions
  for select using (user_id = auth.uid() or public.is_admin());

-- payment_events e trilha interna: so admin le, ninguem escreve.
drop policy if exists "payment_events_select_admin" on public.payment_events;
create policy "payment_events_select_admin" on public.payment_events
  for select using (public.is_admin());

-- ---------------------------------------------------------------------
-- Fecha a escrita de payments e invoices.
--
-- 0001 deu apenas policies de SELECT a essas tabelas, o que ja as deixa
-- sem escrita para `authenticated` -- estas linhas existem para tornar a
-- intencao explicita e sobreviver a alguem adicionar uma policy ampla
-- por engano no futuro.
-- ---------------------------------------------------------------------
drop policy if exists "payments_insert_admin_only" on public.payments;
create policy "payments_insert_admin_only" on public.payments
  for insert with check (public.is_admin());

drop policy if exists "payments_update_admin_only" on public.payments;
create policy "payments_update_admin_only" on public.payments
  for update using (public.is_admin());

drop policy if exists "invoices_insert_admin_only" on public.invoices;
create policy "invoices_insert_admin_only" on public.invoices
  for insert with check (public.is_admin());

drop policy if exists "invoices_update_admin_only" on public.invoices;
create policy "invoices_update_admin_only" on public.invoices
  for update using (public.is_admin());

-- ---------------------------------------------------------------------
-- Ativacao da assinatura -- atomica.
--
-- Roda como uma transacao: registra o pagamento, marca a sessao como
-- concluida, encerra a assinatura anterior e cria a nova, alem de
-- ajustar a cota do perfil. Feito em SQL e nao no route handler porque
-- uma falha no meio deixaria o usuario pago sem plano, ou com duas
-- assinaturas ativas.
--
-- SECURITY DEFINER com execucao revogada de todos: so o service role,
-- a partir do webhook ja verificado, chega aqui.
-- ---------------------------------------------------------------------
create or replace function public.activate_subscription_from_checkout(
  p_session_id uuid,
  p_provider_payment_id text,
  p_period_end timestamptz
)
returns uuid
language plpgsql
security definer set search_path = public
as $fn$
declare
  v_session public.checkout_sessions%rowtype;
  v_plan public.plans%rowtype;
  v_payment_id uuid;
  v_subscription_id uuid;
begin
  select * into v_session from public.checkout_sessions
   where id = p_session_id for update;

  if v_session.id is null then
    raise exception 'Sessao de checkout nao encontrada.';
  end if;

  -- Ja processada: devolve a assinatura existente em vez de duplicar.
  if v_session.status = 'completed' then
    select id into v_subscription_id from public.subscriptions
     where user_id = v_session.user_id and status = 'active'
     order by started_at desc limit 1;
    return v_subscription_id;
  end if;

  select * into v_plan from public.plans where id = v_session.plan_id;
  if v_plan.id is null then
    raise exception 'Plano da sessao nao existe mais.';
  end if;

  -- O valor gravado e o congelado na sessao, nunca um vindo de fora.
  insert into public.payments (user_id, amount_cents, currency, status, provider, provider_payment_id)
  values (v_session.user_id, v_session.amount_cents, v_session.currency,
          'paid', v_session.provider, p_provider_payment_id)
  returning id into v_payment_id;

  update public.subscriptions
     set status = 'canceled', canceled_at = now()
   where user_id = v_session.user_id and status in ('active', 'trialing');

  insert into public.subscriptions
    (user_id, plan_id, status, provider, started_at, current_period_end)
  values (v_session.user_id, v_session.plan_id, 'active',
          v_session.provider, now(), p_period_end)
  returning id into v_subscription_id;

  update public.payments set subscription_id = v_subscription_id where id = v_payment_id;

  insert into public.invoices
    (user_id, subscription_id, payment_id, amount_cents, currency, status)
  values (v_session.user_id, v_subscription_id, v_payment_id,
          v_session.amount_cents, v_session.currency, 'paid');

  -- O trigger de 0004 bloqueia plan_id/storage_quota_bytes para o
  -- usuario, mas nao para o service role, que e quem executa isto.
  update public.profiles
     set plan_id = v_plan.id,
         storage_quota_bytes = v_plan.storage_limit_bytes
   where user_id = v_session.user_id;

  update public.checkout_sessions
     set status = 'completed', completed_at = now()
   where id = p_session_id;

  return v_subscription_id;
end;
$fn$;

revoke all on function public.activate_subscription_from_checkout(uuid, text, timestamptz)
  from public, anon, authenticated;
