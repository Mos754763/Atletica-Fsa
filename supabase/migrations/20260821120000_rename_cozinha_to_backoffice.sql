begin;

-- Renomeia o rótulo do enum sem alterar os OIDs: profiles.role e
-- profile_role_assignments.role passam a exibir backoffice automaticamente.
do $$
declare
  has_legacy boolean;
  has_target boolean;
begin
  select exists(select 1 from pg_enum where enumtypid = 'public.user_role'::regtype and enumlabel = 'cozinha') into has_legacy;
  select exists(select 1 from pg_enum where enumtypid = 'public.user_role'::regtype and enumlabel = 'backoffice') into has_target;

  if has_legacy and not has_target then
    execute 'alter type public.user_role rename value ''cozinha'' to ''backoffice''';
  elsif has_legacy and has_target then
    raise exception 'user_role contém os rótulos cozinha e backoffice; a renomeação não é segura';
  elsif not has_target then
    raise exception 'user_role não contém o rótulo esperado backoffice';
  end if;
end;
$$;

-- Os corpos PL/pgSQL/SQL preservam o texto-fonte. Recria somente funções do
-- schema público que ainda referenciem o rótulo legado, após a troca do enum.
do $$
declare
  function_definition text;
begin
  for function_definition in
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%cozinha%'
  loop
    execute replace(function_definition, '''cozinha''', '''backoffice''');
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) like '%cozinha%'
  ) then
    raise exception 'função pública ainda referencia o papel técnico legado cozinha';
  end if;
end;
$$;

commit;
