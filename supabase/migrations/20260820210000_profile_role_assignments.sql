begin;

-- A coluna profiles.role permanece como compatibilidade temporária. A fonte de
-- verdade para autorização passa a ser uma linha por atribuição nesta tabela.
create table if not exists public.profile_role_assignments (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (profile_id, role)
);

create index if not exists profile_role_assignments_role_profile_idx
  on public.profile_role_assignments(role, profile_id);

insert into public.profile_role_assignments(profile_id, role)
select id, role from public.profiles
on conflict (profile_id, role) do nothing;

create or replace function public.current_user_roles()
returns public.user_role[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(assignment.role order by case assignment.role
    when 'admin' then 1
    when 'caixa' then 2
    when 'cozinha' then 3
    else 4
  end), array[]::public.user_role[])
  from public.profile_role_assignments assignment
  where assignment.profile_id = auth.uid()
$$;

create or replace function public.has_any_role(p_roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_role_assignments assignment
    where assignment.profile_id = auth.uid()
      and assignment.role = any(p_roles)
  )
$$;

-- Mantida exclusivamente para compatibilidade com SQL legado. Nenhuma nova
-- autorização deve depender dela: use public.has_any_role(...).
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  -- Compatibilidade transitória para RPCs legadas: quando Caixa e Backoffice
  -- coexistem, o valor sentinela admin satisfaz apenas guards operacionais que
  -- já aceitam ambos. Políticas administrativas usam is_admin()/has_any_role().
  select case
    when public.has_any_role(array['admin']::public.user_role[]) then 'admin'::public.user_role
    when public.has_any_role(array['caixa', 'cozinha']::public.user_role[]) then 'admin'::public.user_role
    when public.has_any_role(array['caixa']::public.user_role[]) then 'caixa'::public.user_role
    when public.has_any_role(array['cozinha']::public.user_role[]) then 'cozinha'::public.user_role
    else 'cliente'::public.user_role
  end
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin']::public.user_role[])
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin', 'cozinha', 'caixa']::public.user_role[])
$$;

create or replace function public.can_manage_catalog()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_any_role(array['admin']::public.user_role[])
$$;

create or replace function public.sync_profile_primary_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := coalesce(new.profile_id, old.profile_id);
  v_primary_role public.user_role;
begin
  select assignment.role into v_primary_role
  from public.profile_role_assignments assignment
  where assignment.profile_id = v_profile_id
  order by case assignment.role
    when 'admin' then 1
    when 'caixa' then 2
    when 'cozinha' then 3
    else 4
  end
  limit 1;

  update public.profiles
     set role = coalesce(v_primary_role, 'cliente'::public.user_role), updated_at = now()
   where id = v_profile_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists profile_role_assignments_sync_primary_role on public.profile_role_assignments;
create trigger profile_role_assignments_sync_primary_role
after insert or delete on public.profile_role_assignments
for each row execute procedure public.sync_profile_primary_role();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Torcida FSA'), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = now();

  insert into public.profile_role_assignments(profile_id, role)
  values (new.id, 'cliente')
  on conflict (profile_id, role) do nothing;
  return new;
end;
$$;

create or replace function public.replace_profile_roles(
  p_profile_id uuid,
  p_roles public.user_role[]
)
returns public.user_role[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_count integer;
  v_target_has_admin boolean;
  v_result public.user_role[];
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória para alterar atribuições.'; end if;
  if not exists (select 1 from public.profiles actor where actor.id = auth.uid() and actor.is_president = true) then
    raise exception 'Apenas a Presidência pode alterar atribuições.';
  end if;
  if p_profile_id = auth.uid() then raise exception 'Altere o próprio acesso por outro administrador.'; end if;
  if cardinality(p_roles) is null or cardinality(p_roles) < 1 then raise exception 'Todo perfil precisa manter ao menos uma atribuição.'; end if;
  if cardinality(p_roles) <> (select count(distinct assigned_role) from unnest(p_roles) as assigned_role) then raise exception 'Uma atribuição não pode ser repetida.'; end if;
  if not exists (select 1 from public.profiles where id = p_profile_id for update) then raise exception 'Perfil não localizado.'; end if;

  perform pg_advisory_xact_lock(hashtext('atletica-fsa:profile-role-admin-invariant'));

  select exists(
    select 1 from public.profile_role_assignments
    where profile_id = p_profile_id and role = 'admin'
  ) into v_target_has_admin;
  select count(distinct profile_id) into v_admin_count
    from public.profile_role_assignments where role = 'admin';
  if v_target_has_admin and not ('admin' = any(p_roles)) and v_admin_count <= 1 then
    raise exception 'A plataforma precisa manter ao menos um administrador.';
  end if;

  delete from public.profile_role_assignments
   where profile_id = p_profile_id and role <> all(p_roles);
  insert into public.profile_role_assignments(profile_id, role, granted_by)
  select p_profile_id, role, auth.uid() from unnest(p_roles) as role
  on conflict (profile_id, role) do nothing;

  select coalesce(array_agg(assignment.role order by case assignment.role when 'admin' then 1 when 'caixa' then 2 when 'cozinha' then 3 else 4 end), array[]::public.user_role[])
    into v_result
    from public.profile_role_assignments assignment
   where assignment.profile_id = p_profile_id;
  return v_result;
end;
$$;

alter table public.profile_role_assignments enable row level security;
revoke all on table public.profile_role_assignments from public, anon, authenticated;
revoke all on function public.current_user_roles() from public, anon;
grant execute on function public.current_user_roles() to authenticated;
revoke all on function public.has_any_role(public.user_role[]) from public, anon;
grant execute on function public.has_any_role(public.user_role[]) to authenticated;
revoke all on function public.replace_profile_roles(uuid, public.user_role[]) from public, anon;
grant execute on function public.replace_profile_roles(uuid, public.user_role[]) to authenticated;

commit;
