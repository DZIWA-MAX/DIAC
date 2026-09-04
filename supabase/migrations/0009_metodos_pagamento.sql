-- =====================================================================
-- Metodos de pagamento de Mocambique: M-Pesa, e-Mola e cartao.
--
-- Dinheiro movel e cartao tem fluxos OPOSTOS, e o schema precisa
-- refletir isso em vez de forcar os dois no mesmo molde:
--
--   cartao  -> redireciona o navegador para a pagina do adquirente,
--              que devolve o cliente ao site no fim.
--   M-Pesa  -> nao redireciona nada. O servidor envia um pedido de
--   e-Mola     cobranca, o cliente aprova por USSD no proprio telemovel,
--              e a confirmacao chega depois por callback do operador.
--
-- Por isso `method` e uma coluna propria (nao derivada de `provider`) e
-- existe `payer_msisdn`: sem o numero, nao ha para quem enviar o pedido.
-- =====================================================================

alter table public.checkout_sessions
  add column if not exists method text not null default 'card';

alter table public.checkout_sessions
  drop constraint if exists checkout_sessions_method_check;
alter table public.checkout_sessions
  add constraint checkout_sessions_method_check
  check (method in ('mpesa', 'emola', 'card'));

-- Numero do pagador, em formato internacional sem '+' (258XXXXXXXXX).
-- Obrigatorio para dinheiro movel, ausente para cartao — a constraint
-- abaixo impede uma sessao de M-Pesa sem numero, que falharia so na
-- chamada ao operador, tarde demais.
alter table public.checkout_sessions
  add column if not exists payer_msisdn text;

alter table public.checkout_sessions
  drop constraint if exists checkout_sessions_msisdn_check;
-- O `is not null` explicito e obrigatorio, nao redundante: uma CHECK que
-- avalia para NULL e tratada como SATISFEITA. Sem ele, method='mpesa'
-- com payer_msisdn nulo daria `true and NULL` = NULL no segundo ramo, e
-- `false or NULL` = NULL — a constraint passaria, deixando entrar
-- exatamente a linha que ela existe para barrar.
alter table public.checkout_sessions
  add constraint checkout_sessions_msisdn_check
  check (
    (method = 'card' and payer_msisdn is null)
    or (
      method in ('mpesa', 'emola')
      and payer_msisdn is not null
      and payer_msisdn ~ '^258[0-9]{9}$'
    )
  );

-- Referencia que o operador devolve para conciliacao (transaction id do
-- M-Pesa, por exemplo). Separada de provider_session_id porque no
-- dinheiro movel nao existe "sessao": existe uma transacao so.
alter table public.checkout_sessions
  add column if not exists provider_reference text;

create index if not exists checkout_sessions_method_idx
  on public.checkout_sessions (method);
create index if not exists checkout_sessions_reference_idx
  on public.checkout_sessions (provider_reference);

-- ---------------------------------------------------------------------
-- Quais metodos cada plano aceita.
--
-- Deixa desligar um metodo sem mexer em codigo — util enquanto um dos
-- operadores ainda nao estiver aprovado comercialmente.
-- ---------------------------------------------------------------------
alter table public.plans
  add column if not exists payment_methods text[] not null
  default array['mpesa', 'emola', 'card']::text[];

-- ---------------------------------------------------------------------
-- Moeda.
--
-- Os planos foram semeados em BRL na 0001. Clientes locais pagam em
-- meticais, e os operadores mocambicanos so liquidam em MZN — enviar
-- BRL ao M-Pesa seria recusado na origem. Os VALORES ficam como estao:
-- reprecificar e decisao de negocio, nao de migracao.
-- ---------------------------------------------------------------------
update public.plans set currency = 'MZN' where currency = 'BRL';
