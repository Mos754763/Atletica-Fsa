begin;

create or replace function public.assign_sector_membership(
  p_sector_id uuid,
  p_profile_id uuid,
  p_role public.sector_membership_role,
  p_actor_id uuid,
  p_note text default null
)
returns public.sector_memberships
language plpgsql
security definer
set search_path = public
as $$
declare
  v_membership public.sector_memberships;
begin
  if not exists (select 1 from public.profiles where id = p_actor_id and is_president) then
    raise exception 'Somente a presidência pode movimentar integrantes entre setores.';
  end if;
  if not exists (select 1 from public.sectors where id = p_sector_id and is_active and deleted_at is null) then
    raise exception 'Setor ativo não encontrado.';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'Integrante não encontrado.';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_sector_id::text));

  if p_role = 'diretor' then
    update public.sector_memberships
       set ended_at = now(), ended_by = p_actor_id, note = coalesce(note, 'Diretoria substituída pela presidência.')
     where sector_id = p_sector_id and role = 'diretor' and ended_at is null;
  end if;

  update public.sector_memberships
     set ended_at = now(), ended_by = p_actor_id
   where sector_id = p_sector_id and profile_id = p_profile_id and ended_at is null;

  insert into public.sector_memberships (sector_id, profile_id, role, created_by, note)
  values (p_sector_id, p_profile_id, p_role, p_actor_id, nullif(trim(p_note), ''))
  returning * into v_membership;

  return v_membership;
end;
$$;

revoke all on function public.assign_sector_membership(uuid, uuid, public.sector_membership_role, uuid, text) from public, anon, authenticated;
grant execute on function public.assign_sector_membership(uuid, uuid, public.sector_membership_role, uuid, text) to service_role;

commit;
