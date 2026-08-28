-- =====================================================================
-- Security fix: privilege-escalation gap found in review.
--
-- `profiles_update_own` only restricts WHICH ROW a user can update
-- (their own), not WHICH COLUMNS. Row Level Security in Postgres has no
-- built-in per-column restriction, so any authenticated user could call
-- the Supabase client directly (bypassing the app's /api/admin/* routes
-- entirely) and do e.g.:
--
--   supabase.from('profiles').update({ role: 'admin' }).eq('user_id', me)
--
-- ...to grant themselves the admin role, or set an arbitrary
-- storage_quota_bytes, or unblock their own blocked account. This
-- trigger closes that gap by rejecting any UPDATE that changes role,
-- status, plan_id or storage_quota_bytes unless the caller is an admin
-- (via profiles_update_admin's own auth.uid()-based session) or the
-- service role (for a future payment-webhook handler).
--
-- Only UPDATE is covered — INSERT into profiles is unreachable for a
-- malicious payload in practice, because handle_new_user() already
-- creates the row on signup and profiles.user_id is UNIQUE, so a second
-- insert attempt for an existing account fails on the constraint before
-- any supplied field matters.
-- =====================================================================

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Não é permitido alterar o campo role do próprio perfil.';
  end if;
  if new.status is distinct from old.status then
    raise exception 'Não é permitido alterar o campo status do próprio perfil.';
  end if;
  if new.plan_id is distinct from old.plan_id then
    raise exception 'Não é permitido alterar o plano diretamente. Use a área de assinatura.';
  end if;
  if new.storage_quota_bytes is distinct from old.storage_quota_bytes then
    raise exception 'Não é permitido alterar a cota de armazenamento diretamente.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_privileged_columns on public.profiles;
create trigger protect_privileged_columns
  before update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- =====================================================================
-- Security fix: `subscriptions` was writable by its own owner.
--
-- Nothing in the app ever writes to `subscriptions` from the client —
-- real payment confirmations will always come from a service-role
-- webhook handler (which bypasses RLS entirely regardless of these
-- policies). Letting a regular user insert/update their own
-- subscription row served no purpose and let them fabricate a fake
-- "active" paid subscription record. Restrict both to admins (their own
-- session, via is_admin()); reads stay unchanged (owner or admin).
-- =====================================================================

drop policy if exists "subscriptions_insert_own_or_admin" on public.subscriptions;
create policy "subscriptions_insert_admin_only" on public.subscriptions
  for insert with check (public.is_admin());

drop policy if exists "subscriptions_update_own_or_admin" on public.subscriptions;
create policy "subscriptions_update_admin_only" on public.subscriptions
  for update using (public.is_admin());
