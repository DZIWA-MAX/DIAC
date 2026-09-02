-- =====================================================================
-- Fix: the privileged-column trigger from 0004 correctly blocks a
-- regular authenticated user from setting their own `role`/`status`/
-- `plan_id`/`storage_quota_bytes` via the app's PostgREST session, but
-- it also blocked queries run directly in the Supabase SQL Editor —
-- e.g. the documented "promote yourself to admin" bootstrap step.
--
-- The SQL Editor (and any direct/superuser Postgres connection, like a
-- migration) carries no PostgREST JWT at all, so both auth.uid() and
-- auth.role() are NULL there — there is no session to check. That is
-- exactly the same context RLS itself already treats as trusted (a
-- superuser bypasses RLS regardless of policy), so the trigger should
-- match that: treat "no JWT session at all" as trusted, on top of the
-- existing admin/service_role bypass.
--
-- This does not reopen the hole 0004 closed: a real anon/authenticated
-- PostgREST request always carries a role, and `profiles_update_own`'s
-- own `using (user_id = auth.uid())` already rejects a request with no
-- uid (auth.uid() = NULL can never equal a real user_id) before this
-- trigger even runs — so the new bypass is only reachable from a
-- context RLS already fully bypasses anyway.
-- =====================================================================

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() or auth.role() = 'service_role' or auth.uid() is null then
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
