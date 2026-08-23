-- =====================================================================
-- Recursive trash / restore helpers for folders.
-- SECURITY DEFINER but each function re-checks ownership against
-- auth.uid() internally, so a caller can never touch another user's
-- folder even though the function runs with elevated privileges.
-- =====================================================================

create or replace function public.trash_folder(p_folder_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.folders where id = p_folder_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Pasta não encontrada ou acesso negado.';
  end if;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id and user_id = auth.uid()
    union all
    select f.id from public.folders f
    inner join descendants d on f.parent_id = d.id
    where f.user_id = auth.uid()
  )
  update public.folders
    set deleted_at = now()
    where id in (select id from descendants) and deleted_at is null;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id and user_id = auth.uid()
    union all
    select f.id from public.folders f
    inner join descendants d on f.parent_id = d.id
    where f.user_id = auth.uid()
  )
  update public.files
    set status = 'trashed', deleted_at = now()
    where folder_id in (select id from descendants)
      and user_id = auth.uid()
      and status = 'active';
end;
$$;

create or replace function public.restore_folder(p_folder_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from public.folders where id = p_folder_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Pasta não encontrada ou acesso negado.';
  end if;

  with recursive descendants as (
    select id from public.folders where id = p_folder_id and user_id = auth.uid()
    union all
    select f.id from public.folders f
    inner join descendants d on f.parent_id = d.id
    where f.user_id = auth.uid()
  )
  update public.folders
    set deleted_at = null
    where id in (select id from descendants);

  with recursive descendants as (
    select id from public.folders where id = p_folder_id and user_id = auth.uid()
    union all
    select f.id from public.folders f
    inner join descendants d on f.parent_id = d.id
    where f.user_id = auth.uid()
  )
  update public.files
    set status = 'active', deleted_at = null
    where folder_id in (select id from descendants)
      and user_id = auth.uid()
      and status = 'trashed';
end;
$$;

grant execute on function public.trash_folder(uuid) to authenticated;
grant execute on function public.restore_folder(uuid) to authenticated;
