-- =====================================================================
-- Admin-only aggregate statistics function.
--
-- Deliberately returns ONLY counts and sums — never file names, paths or
-- any other row-level content — so an admin gets operational visibility
-- (spec section 20/21) without being able to browse private user files
-- through this function (spec section 20's "specific and registered
-- permission" requirement). Access itself is also logged by the calling
-- API route via security_logs.
-- =====================================================================

create or replace function public.admin_get_platform_stats()
returns table (
  total_users bigint,
  active_users bigint,
  blocked_users bigint,
  total_files bigint,
  total_storage_bytes bigint,
  active_subscriptions bigint,
  monthly_revenue_cents bigint
)
language plpgsql
stable
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;

  return query
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.profiles where status = 'active')::bigint,
    (select count(*) from public.profiles where status = 'blocked')::bigint,
    (select count(*) from public.files where status = 'active')::bigint,
    (select coalesce(sum(size), 0) from public.files where status = 'active')::bigint,
    (select count(*) from public.subscriptions where status = 'active')::bigint,
    (
      select coalesce(sum(p.price_cents), 0)
      from public.subscriptions s
      join public.plans p on p.id = s.plan_id
      where s.status = 'active' and p.billing_period = 'monthly'
    )::bigint;
end;
$$;

grant execute on function public.admin_get_platform_stats() to authenticated;
