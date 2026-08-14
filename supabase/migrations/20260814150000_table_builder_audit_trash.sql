-- Construtor de Tabelas Nível B: metadados flexíveis, registros JSONB e auditoria.
create table if not exists public.custom_tables (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.sectors(id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(sector_id, slug)
);
create table if not exists public.custom_table_fields (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.custom_tables(id) on delete cascade,
  name text not null, slug text not null,
  field_type text not null check (field_type in ('text','number','date','single_select','multi_select','person','checkbox')),
  config_json jsonb not null default '{}'::jsonb,
  is_required boolean not null default false, sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique(table_id, slug)
);
create table if not exists public.custom_table_records (
  id uuid primary key default gen_random_uuid(),
  table_id uuid not null references public.custom_tables(id) on delete cascade,
  data_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz, deleted_by uuid references public.profiles(id) on delete set null
);
create table if not exists public.custom_table_views (
  id uuid primary key default gen_random_uuid(), table_id uuid not null references public.custom_tables(id) on delete cascade,
  name text not null, view_type text not null default 'table' check (view_type in ('table','kanban','calendar','gallery')),
  filter_json jsonb not null default '{}'::jsonb, sort_json jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz
);
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), sector_id uuid references public.sectors(id) on delete set null,
  entity_type text not null, entity_id uuid, action text not null check (action in ('create','update','delete','restore','move')),
  before_json jsonb, after_json jsonb, actor_id uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index if not exists custom_table_records_lookup_idx on public.custom_table_records(table_id, updated_at desc) where deleted_at is null;
create index if not exists audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.can_table_action(p_table_id uuid, p_action text) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_president() or exists (
    select 1 from public.custom_tables t join public.sector_memberships sm on sm.sector_id = t.sector_id
    where t.id = p_table_id and sm.profile_id = auth.uid() and sm.ended_at is null and sm.role = 'diretor'
  ) or exists (
    select 1 from public.permission_grants g where g.profile_id = auth.uid() and g.revoked_at is null
      and g.action::text = p_action and g.resource_key in ('*', 'table:*', 'table:' || p_table_id::text)
  );
$$;
create or replace function public.can_manage_sector_tables(p_sector_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_president() or exists (select 1 from public.sector_memberships sm where sm.sector_id = p_sector_id and sm.profile_id = auth.uid() and sm.ended_at is null and sm.role = 'diretor');
$$;
create or replace function public.audit_custom_builder() returns trigger language plpgsql security definer set search_path = public as $$
declare row_sector uuid; actor uuid := auth.uid();
begin
  if tg_table_name = 'custom_tables' then row_sector := coalesce(new.sector_id, old.sector_id); else select sector_id into row_sector from public.custom_tables where id = coalesce(new.table_id, old.table_id); end if;
  insert into public.audit_logs(sector_id, entity_type, entity_id, action, before_json, after_json, actor_id)
  values (row_sector, tg_table_name, coalesce(new.id, old.id), lower(tg_op)::text, case when tg_op = 'INSERT' then null else to_jsonb(old) end, case when tg_op = 'DELETE' then null else to_jsonb(new) end, actor);
  return coalesce(new, old);
end; $$;
drop trigger if exists custom_tables_audit on public.custom_tables; create trigger custom_tables_audit after insert or update on public.custom_tables for each row execute procedure public.audit_custom_builder();
drop trigger if exists custom_fields_audit on public.custom_table_fields; create trigger custom_fields_audit after insert or update on public.custom_table_fields for each row execute procedure public.audit_custom_builder();
drop trigger if exists custom_records_audit on public.custom_table_records; create trigger custom_records_audit after insert or update on public.custom_table_records for each row execute procedure public.audit_custom_builder();
drop trigger if exists custom_views_audit on public.custom_table_views; create trigger custom_views_audit after insert or update on public.custom_table_views for each row execute procedure public.audit_custom_builder();
drop trigger if exists custom_tables_updated on public.custom_tables; create trigger custom_tables_updated before update on public.custom_tables for each row execute procedure public.set_updated_at();
drop trigger if exists custom_fields_updated on public.custom_table_fields; create trigger custom_fields_updated before update on public.custom_table_fields for each row execute procedure public.set_updated_at();
drop trigger if exists custom_records_updated on public.custom_table_records; create trigger custom_records_updated before update on public.custom_table_records for each row execute procedure public.set_updated_at();
drop trigger if exists custom_views_updated on public.custom_table_views; create trigger custom_views_updated before update on public.custom_table_views for each row execute procedure public.set_updated_at();

alter table public.custom_tables enable row level security; alter table public.custom_table_fields enable row level security; alter table public.custom_table_records enable row level security; alter table public.custom_table_views enable row level security; alter table public.audit_logs enable row level security;
create policy "builder tables: view" on public.custom_tables for select to authenticated using (public.can_table_action(id, 'ver'));
create policy "builder tables: create" on public.custom_tables for insert to authenticated with check (public.can_manage_sector_tables(sector_id));
create policy "builder tables: manage" on public.custom_tables for update to authenticated using (public.can_manage_sector_tables(sector_id)) with check (public.can_manage_sector_tables(sector_id));
create policy "builder fields: view" on public.custom_table_fields for select to authenticated using (public.can_table_action(table_id, 'ver'));
create policy "builder fields: manage" on public.custom_table_fields for all to authenticated using (public.can_table_action(table_id, 'editar')) with check (public.can_table_action(table_id, 'editar'));
create policy "builder records: view" on public.custom_table_records for select to authenticated using (public.can_table_action(table_id, 'ver'));
create policy "builder records: create" on public.custom_table_records for insert to authenticated with check (public.can_table_action(table_id, 'criar'));
create policy "builder records: edit" on public.custom_table_records for update to authenticated using (public.can_table_action(table_id, 'editar')) with check (public.can_table_action(table_id, 'editar'));
create policy "builder views: view" on public.custom_table_views for select to authenticated using (public.can_table_action(table_id, 'ver'));
create policy "builder views: manage" on public.custom_table_views for all to authenticated using (public.can_table_action(table_id, 'editar')) with check (public.can_table_action(table_id, 'editar'));
create policy "builder audit: president reads" on public.audit_logs for select to authenticated using (public.is_president());
