-- Trilha operacional de CRM: fatos imutáveis e obrigações explicitamente atribuídas.
create table if not exists public.crm_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  actor_kind text not null default 'user' check (actor_kind in ('user', 'system', 'integration')),
  action text not null check (char_length(trim(action)) between 3 and 160),
  outcome text not null default 'succeeded' check (outcome in ('succeeded', 'blocked', 'failed', 'ignored')),
  resource_type text not null check (char_length(trim(resource_type)) between 2 and 100),
  resource_id uuid,
  sector_id uuid references public.sectors(id) on delete set null,
  source text not null default 'web' check (source in ('web', 'api', 'cron', 'external_sync', 'system')),
  request_id uuid,
  summary text not null check (char_length(trim(summary)) between 3 and 400),
  metadata_json jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists crm_activity_logs_actor_occurred_idx on public.crm_activity_logs(actor_id, occurred_at desc);
create index if not exists crm_activity_logs_resource_occurred_idx on public.crm_activity_logs(resource_type, resource_id, occurred_at desc);
create index if not exists crm_activity_logs_outcome_occurred_idx on public.crm_activity_logs(outcome, occurred_at desc);

create table if not exists public.crm_activity_expectations (
  id uuid primary key default gen_random_uuid(),
  assigned_to uuid not null references public.profiles(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  completed_by uuid references public.profiles(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 3 and 180),
  expected_action text not null check (char_length(trim(expected_action)) between 3 and 160),
  resource_type text,
  resource_id uuid,
  sector_id uuid references public.sectors(id) on delete set null,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  due_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cancelled_at is null or completed_at is null)
);

create index if not exists crm_activity_expectations_assignee_idx on public.crm_activity_expectations(assigned_to, due_at asc) where completed_at is null and cancelled_at is null;
create index if not exists crm_activity_expectations_open_idx on public.crm_activity_expectations(due_at asc) where completed_at is null and cancelled_at is null;

create or replace function public.audit_crm_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_kind text := case when auth.uid() is null then 'system' else 'user' end;
  v_sector uuid;
  v_resource_id uuid := coalesce(new.id, old.id);
  v_action text := lower(tg_table_name) || '.' || lower(tg_op);
  v_summary text := case tg_op when 'INSERT' then 'Registro criado' when 'UPDATE' then 'Registro atualizado' else 'Registro removido' end;
begin
  if tg_table_name = 'sectors' then
    v_sector := coalesce(new.id, old.id);
  elsif tg_table_name in ('sector_memberships', 'permission_grants', 'custom_tables') then
    v_sector := coalesce(new.sector_id, old.sector_id);
  end if;

  insert into public.crm_activity_logs(actor_id, actor_kind, action, outcome, resource_type, resource_id, sector_id, source, summary, metadata_json)
  values (
    v_actor,
    v_actor_kind,
    v_action,
    'succeeded',
    tg_table_name,
    v_resource_id,
    v_sector,
    case when v_actor is null then 'system' else 'web' end,
    v_summary,
    jsonb_build_object('database_operation', lower(tg_op))
  );
  return coalesce(new, old);
end;
$$;

create or replace function public.record_crm_access_denied(p_allowed_roles text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
begin
  if v_actor is null then return null; end if;
  insert into public.crm_activity_logs(actor_id, actor_kind, action, outcome, resource_type, source, summary, metadata_json)
  values (
    v_actor,
    'user',
    'authorization.access_blocked',
    'blocked',
    'authorization',
    'web',
    'Tentativa de acesso sem papel autorizado',
    jsonb_build_object('allowed_roles', coalesce(to_jsonb(p_allowed_roles), '[]'::jsonb))
  ) returning id into v_id;
  return v_id;
end;
$$;

drop trigger if exists crm_activity_events on public.events;
create trigger crm_activity_events after insert or update or delete on public.events for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_event_ticket_lots on public.event_ticket_lots;
create trigger crm_activity_event_ticket_lots after insert or update or delete on public.event_ticket_lots for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_event_registrations on public.event_registrations;
create trigger crm_activity_event_registrations after insert or update or delete on public.event_registrations for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_event_tickets on public.event_tickets;
create trigger crm_activity_event_tickets after insert or update or delete on public.event_tickets for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_orders on public.orders;
create trigger crm_activity_orders after insert or update or delete on public.orders for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_payments on public.payments;
create trigger crm_activity_payments after insert or update or delete on public.payments for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_products on public.products;
create trigger crm_activity_products after insert or update or delete on public.products for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_profiles on public.profiles;
create trigger crm_activity_profiles after insert or update on public.profiles for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_sectors on public.sectors;
create trigger crm_activity_sectors after insert or update or delete on public.sectors for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_sector_memberships on public.sector_memberships;
create trigger crm_activity_sector_memberships after insert or update or delete on public.sector_memberships for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_permission_grants on public.permission_grants;
create trigger crm_activity_permission_grants after insert or update or delete on public.permission_grants for each row execute procedure public.audit_crm_activity();
drop trigger if exists crm_activity_expectations on public.crm_activity_expectations;
create trigger crm_activity_expectations after insert or update or delete on public.crm_activity_expectations for each row execute procedure public.audit_crm_activity();

alter table public.crm_activity_logs enable row level security;
alter table public.crm_activity_expectations enable row level security;

grant select on public.crm_activity_logs to authenticated;
grant select, insert, update on public.crm_activity_expectations to authenticated;
grant execute on function public.record_crm_access_denied(text[]) to authenticated;

create policy "crm activities: administrators read" on public.crm_activity_logs for select to authenticated using (public.is_admin() or public.is_president());
create policy "crm expectations: administrators manage" on public.crm_activity_expectations for all to authenticated using (public.is_admin() or public.is_president()) with check (public.is_admin() or public.is_president());
create policy "crm expectations: assignee reads" on public.crm_activity_expectations for select to authenticated using (assigned_to = auth.uid());
