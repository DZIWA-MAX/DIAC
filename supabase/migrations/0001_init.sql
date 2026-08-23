-- =====================================================================
-- NuvemX — Initial schema
-- Postgres / Supabase. Files themselves are NEVER stored here — only
-- metadata. Binary content lives in Supabase Storage under
-- `user_id/folder_id/filename` inside a PRIVATE bucket.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- profiles — one row per auth.users row (1:1), holds app-level identity
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null default '',
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  status text not null default 'active' check (status in ('active', 'blocked')),
  plan_id uuid,
  storage_quota_bytes bigint not null default 5368709120, -- 5 GB default
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles (user_id);
create index if not exists profiles_role_idx on public.profiles (role);

-- ---------------------------------------------------------------------
-- plans — configurable pricing/limits, editable from the admin area
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- 'free' | 'starter' | 'pro' | 'business'
  name text not null,
  storage_limit_bytes bigint not null,
  price_cents integer not null default 0,
  currency text not null default 'BRL',
  billing_period text not null default 'monthly' check (billing_period in ('monthly', 'yearly')),
  max_upload_size_bytes bigint not null default 2147483648,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_plan_id_fkey foreign key (plan_id) references public.plans (id) on delete set null;

-- ---------------------------------------------------------------------
-- folders
-- ---------------------------------------------------------------------
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.folders (id) on delete cascade,
  name text not null,
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);
create index if not exists folders_parent_id_idx on public.folders (parent_id);
create index if not exists folders_deleted_at_idx on public.folders (deleted_at);

-- ---------------------------------------------------------------------
-- files — metadata only
-- ---------------------------------------------------------------------
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.folders (id) on delete cascade,
  name text not null,
  storage_path text not null unique,
  mime_type text not null default 'application/octet-stream',
  size bigint not null default 0,
  hash text,
  status text not null default 'active' check (status in ('active', 'trashed')),
  is_favorite boolean not null default false,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists files_user_id_idx on public.files (user_id);
create index if not exists files_folder_id_idx on public.files (folder_id);
create index if not exists files_deleted_at_idx on public.files (deleted_at);
create index if not exists files_name_idx on public.files using gin (to_tsvector('simple', name));

-- ---------------------------------------------------------------------
-- shares — share links for files (tokenised, never a permanent public URL)
-- ---------------------------------------------------------------------
create table if not exists public.shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.files (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  password_hash text,
  allow_download boolean not null default true,
  expires_at timestamptz,
  revoked_at timestamptz,
  view_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists shares_file_id_idx on public.shares (file_id);
create index if not exists shares_user_id_idx on public.shares (user_id);
create index if not exists shares_token_idx on public.shares (token);

-- ---------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid not null references public.plans (id),
  status text not null default 'trialing' check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  provider text,
  provider_subscription_id text,
  cancel_at_period_end boolean not null default false,
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  expires_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);

-- ---------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  provider text,
  provider_payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);

-- ---------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subscription_id uuid references public.subscriptions (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'BRL',
  status text not null default 'open' check (status in ('open', 'paid', 'void', 'uncollectible')),
  issued_at timestamptz not null default now(),
  due_at timestamptz
);

create index if not exists invoices_user_id_idx on public.invoices (user_id);

-- ---------------------------------------------------------------------
-- security_logs
-- ---------------------------------------------------------------------
create table if not exists public.security_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists security_logs_user_id_idx on public.security_logs (user_id);
create index if not exists security_logs_action_idx on public.security_logs (action);
create index if not exists security_logs_created_at_idx on public.security_logs (created_at desc);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.folders;
create trigger set_updated_at before update on public.folders
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.files;
create trigger set_updated_at before update on public.files
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.plans;
create trigger set_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.subscriptions;
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Auto-create a profile row whenever a new auth user signs up
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  free_plan_id uuid;
begin
  select id into free_plan_id from public.plans where code = 'free' limit 1;

  insert into public.profiles (user_id, name, plan_id, storage_quota_bytes)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    free_plan_id,
    coalesce((select storage_limit_bytes from public.plans where id = free_plan_id), 5368709120)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Storage usage helper — sums active (non-trashed) file sizes for a user
-- =====================================================================
create or replace function public.get_storage_used(p_user_id uuid)
returns bigint
language sql
stable
security definer set search_path = public
as $$
  select coalesce(sum(size), 0)::bigint
  from public.files
  where user_id = p_user_id
    and status = 'active';
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.files enable row level security;
alter table public.shares enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.invoices enable row level security;
alter table public.security_logs enable row level security;

-- Helper: is the current JWT user an admin? (checked via profiles table)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- ---- profiles ----
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin" on public.profiles
  for update using (public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

-- ---- folders ----
drop policy if exists "folders_all_own" on public.folders;
create policy "folders_select_own" on public.folders
  for select using (user_id = auth.uid());
create policy "folders_insert_own" on public.folders
  for insert with check (user_id = auth.uid());
create policy "folders_update_own" on public.folders
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "folders_delete_own" on public.folders
  for delete using (user_id = auth.uid());

-- ---- files ----
create policy "files_select_own" on public.files
  for select using (user_id = auth.uid());
create policy "files_insert_own" on public.files
  for insert with check (user_id = auth.uid());
create policy "files_update_own" on public.files
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "files_delete_own" on public.files
  for delete using (user_id = auth.uid());

-- ---- shares ---- (owner manages; public reading goes through a server
-- route using the service role after validating token/password/expiry —
-- anon clients never query this table directly)
create policy "shares_select_own" on public.shares
  for select using (user_id = auth.uid());
create policy "shares_insert_own" on public.shares
  for insert with check (user_id = auth.uid());
create policy "shares_update_own" on public.shares
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shares_delete_own" on public.shares
  for delete using (user_id = auth.uid());

-- ---- plans ---- (public read of active plans; only admins write)
create policy "plans_select_active_or_admin" on public.plans
  for select using (active = true or public.is_admin());
create policy "plans_write_admin" on public.plans
  for insert with check (public.is_admin());
create policy "plans_update_admin" on public.plans
  for update using (public.is_admin());
create policy "plans_delete_admin" on public.plans
  for delete using (public.is_admin());

-- ---- subscriptions ----
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select using (user_id = auth.uid() or public.is_admin());
create policy "subscriptions_insert_own_or_admin" on public.subscriptions
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "subscriptions_update_own_or_admin" on public.subscriptions
  for update using (user_id = auth.uid() or public.is_admin());

-- ---- payments ----
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());

-- ---- invoices ----
create policy "invoices_select_own_or_admin" on public.invoices
  for select using (user_id = auth.uid() or public.is_admin());

-- ---- security_logs ---- (users see their own; only admins see all; only
-- server-side, service-role code inserts — never the browser)
create policy "security_logs_select_own_or_admin" on public.security_logs
  for select using (user_id = auth.uid() or public.is_admin());

-- =====================================================================
-- Seed default plans
-- =====================================================================
insert into public.plans (code, name, storage_limit_bytes, price_cents, currency, billing_period, max_upload_size_bytes, features, sort_order)
values
  ('free', 'Free', 5368709120, 0, 'BRL', 'monthly', 2147483648,
   '["Armazenamento básico", "Upload", "Download", "Pastas", "Compartilhamento"]'::jsonb, 1),
  ('starter', 'Starter', 107374182400, 990, 'BRL', 'monthly', 5368709120,
   '["100 GB", "Compartilhamento avançado", "Links protegidos", "Maior limite de upload"]'::jsonb, 2),
  ('pro', 'Pro', 536870912000, 2490, 'BRL', 'monthly', 10737418240,
   '["500 GB", "Recursos avançados", "Prioridade de suporte"]'::jsonb, 3),
  ('business', 'Business', 1099511627776, 3990, 'BRL', 'monthly', 21474836480,
   '["1 TB", "Recursos para pequenas empresas", "Compartilhamento avançado", "Administração"]'::jsonb, 4)
on conflict (code) do nothing;

-- =====================================================================
-- Storage bucket (private) — files are only reachable via signed URLs
-- generated server-side after an authorization check.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('nuvemx-files', 'nuvemx-files', false)
on conflict (id) do nothing;

-- Storage object policies: path must start with the caller's own user_id
-- segment, so a user can never read/write another user's objects even if
-- they guess a path.
drop policy if exists "storage_select_own" on storage.objects;
create policy "storage_select_own" on storage.objects
  for select using (
    bucket_id = 'nuvemx-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_insert_own" on storage.objects;
create policy "storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'nuvemx-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_update_own" on storage.objects;
create policy "storage_update_own" on storage.objects
  for update using (
    bucket_id = 'nuvemx-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storage_delete_own" on storage.objects;
create policy "storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'nuvemx-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
