-- =====================================================================
-- VPN individual — control plane
--
-- IMPORTANT / ARCHITECTURE
-- ------------------------
-- The Next.js app CANNOT be the VPN server itself: a tunnel needs raw
-- UDP and kernel-level network access, and the app runs on a serverless
-- HTTP platform (Vercel). What lives here is the *control plane*:
--
--   * `vpn_servers`  — the real WireGuard nodes (VPS) you operate.
--   * `vpn_profiles` — one per user device. Holds the peer keys, the
--                      allocated tunnel IP, and the token that backs the
--                      per-user config URL.
--
-- A small agent on each VPS polls `/api/vpn/nodes/sync` (authenticated
-- with that server's sync secret) and applies the peer list with
-- `wg set`. That agent is the data plane; this schema is what it reads.
-- See docs/VPN.md for the VPS setup.
--
-- SECURITY MODEL
-- --------------
-- Both tables are RLS-enabled with NO policy for `authenticated`. That
-- is deliberate, not an oversight: a profile row holds the peer's
-- private key (encrypted at rest, but still), and Postgres RLS is
-- row-level — it cannot hide a single column from a SELECT. So the
-- browser never touches these tables directly. All access goes through
-- server-side API routes using the service role, which re-derive the
-- acting user from the session cookie and project only safe columns.
-- =====================================================================

-- ---------------------------------------------------------------------
-- vpn_servers — the WireGuard nodes (admin-managed)
-- ---------------------------------------------------------------------
create table if not exists public.vpn_servers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Public hostname/IP + UDP port clients dial, e.g. 'vpn.nuvemx.app:51820'
  endpoint text not null,
  -- The node's WireGuard public key (base64, 44 chars). The matching
  -- private key NEVER leaves the VPS — it is not stored here.
  public_key text not null,
  -- Tunnel subnet this node hands out, e.g. '10.8.0.0/24'. Host .1 is
  -- reserved for the node itself, so client allocation starts at .2.
  subnet cidr not null,
  dns text not null default '1.1.1.1, 1.0.0.1',
  -- What the client routes through the tunnel. Default = full tunnel.
  allowed_ips text not null default '0.0.0.0/0, ::/0',
  -- sha256 of the bearer token the node's sync agent presents. A random
  -- high-entropy secret, so a plain digest is the right primitive here
  -- (no password stretching needed); the raw value is shown once on
  -- creation and never stored.
  sync_secret_hash text not null,
  last_sync_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vpn_servers_active_idx on public.vpn_servers (active);

-- ---------------------------------------------------------------------
-- vpn_profiles — one per user device
-- ---------------------------------------------------------------------
create table if not exists public.vpn_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  server_id uuid not null references public.vpn_servers (id) on delete cascade,
  name text not null,

  -- Peer keypair. The public key goes to the node; the private key is
  -- encrypted at rest (AES-256-GCM, key derived from APP_SECRET) and is
  -- only ever decrypted server-side to render this user's own config.
  public_key text not null,
  private_key_enc text not null,
  preshared_key_enc text not null,

  -- Allocated host number inside the server's subnet (2, 3, 4, ...).
  address_index integer not null,

  -- Backs the per-user config URL (/api/vpn/config/<token>). Same shape
  -- as `shares.token`: opaque, revocable and time-boxed, so a link that
  -- leaks stops working instead of exposing the tunnel forever.
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  link_expires_at timestamptz not null default (now() + interval '15 minutes'),

  revoked_at timestamptz,
  last_handshake_at timestamptz,
  rx_bytes bigint not null default 0,
  tx_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Two peers on the same node can never share a tunnel IP.
  unique (server_id, address_index)
);

create index if not exists vpn_profiles_user_id_idx on public.vpn_profiles (user_id);
create index if not exists vpn_profiles_server_id_idx on public.vpn_profiles (server_id);
create index if not exists vpn_profiles_token_idx on public.vpn_profiles (token);
create index if not exists vpn_profiles_revoked_at_idx on public.vpn_profiles (revoked_at);

drop trigger if exists set_updated_at on public.vpn_servers;
create trigger set_updated_at before update on public.vpn_servers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.vpn_profiles;
create trigger set_updated_at before update on public.vpn_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Plan gating: how many VPN devices each plan allows
-- ---------------------------------------------------------------------
alter table public.plans
  add column if not exists vpn_enabled boolean not null default true;
alter table public.plans
  add column if not exists vpn_device_limit integer not null default 1;

update public.plans set vpn_device_limit = 1 where code = 'free';
update public.plans set vpn_device_limit = 3 where code = 'starter';
update public.plans set vpn_device_limit = 5 where code = 'pro';
update public.plans set vpn_device_limit = 10 where code = 'business';

-- ---------------------------------------------------------------------
-- Address allocation
--
-- Picks the lowest free host number in the node's subnet, reusing gaps
-- left by revoked profiles that were deleted. The advisory lock is what
-- makes two simultaneous "create device" requests safe — without it both
-- could read the same max() and race to the same IP (the unique
-- constraint would catch it, but one user would eat an error).
-- ---------------------------------------------------------------------
create or replace function public.vpn_allocate_address_index(p_server_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_subnet cidr;
  v_max_index integer;
  v_search_ceiling integer;
  v_index integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('vpn_alloc:' || p_server_id::text, 0));

  select subnet into v_subnet from public.vpn_servers where id = p_server_id;
  if v_subnet is null then
    raise exception 'Servidor VPN nao encontrado.';
  end if;

  if masklen(v_subnet) < 16 or masklen(v_subnet) > 30 then
    raise exception 'Subnet do servidor VPN deve estar entre /16 e /30.';
  end if;

  -- Highest usable host index: 2^(32-masklen) - 2 is the last host, and
  -- .1 is the node itself, so clients live in [2, v_max_index].
  v_max_index := (2 ^ (32 - masklen(v_subnet)))::integer - 2;

  -- The lowest free index is either a gap below the current maximum or
  -- exactly max+1, so searching past that is wasted work — without this
  -- bound a /16 would scan 65k rows on every allocation.
  select coalesce(max(address_index), 1) + 1 into v_search_ceiling
  from public.vpn_profiles where server_id = p_server_id;

  select min(candidate) into v_index
  from generate_series(2, least(v_search_ceiling, v_max_index)) as candidate
  where not exists (
    select 1 from public.vpn_profiles
    where server_id = p_server_id and address_index = candidate
  );

  if v_index is null then
    raise exception 'Sem enderecos disponiveis neste servidor VPN.';
  end if;

  return v_index;
end;
$$;

revoke all on function public.vpn_allocate_address_index(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- RLS — locked to the service role (see SECURITY MODEL above)
-- ---------------------------------------------------------------------
alter table public.vpn_servers enable row level security;
alter table public.vpn_profiles enable row level security;

-- No policies for anon/authenticated on purpose. With RLS enabled and no
-- permissive policy, every non-service-role request returns zero rows and
-- every write is rejected — the API routes are the only way in.
