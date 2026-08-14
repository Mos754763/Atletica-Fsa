begin;

alter table public.integration_alerts
  drop constraint if exists integration_alerts_alert_type_check;

alter table public.integration_alerts
  add constraint integration_alerts_alert_type_check
  check (alert_type in ('sympla_sync_failed', 'sympla_health_peak', 'sympla_health_recovered'));

create table if not exists public.integration_health_states (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  scope text not null default 'sync' check (scope in ('sync', 'cron_routes')),
  status text not null check (status in ('healthy', 'warning', 'critical')),
  incident_started_at timestamptz,
  last_checked_at timestamptz not null default now(),
  last_recovered_at timestamptz,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (integration_id, scope)
);

create table if not exists public.scheduled_route_heartbeats (
  id uuid primary key default gen_random_uuid(),
  route_path text not null check (char_length(trim(route_path)) between 4 and 180),
  status text not null check (status in ('succeeded', 'failed')),
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  detail text,
  executed_at timestamptz not null default now()
);

create index if not exists integration_health_states_status_idx
  on public.integration_health_states(status, last_checked_at desc);
create index if not exists scheduled_route_heartbeats_route_executed_idx
  on public.scheduled_route_heartbeats(route_path, executed_at desc);

alter table public.integration_health_states enable row level security;
alter table public.scheduled_route_heartbeats enable row level security;

create policy "integration health: administrators read"
  on public.integration_health_states for select to authenticated
  using (public.is_admin());
create policy "scheduled heartbeats: administrators read"
  on public.scheduled_route_heartbeats for select to authenticated
  using (public.is_admin());

create or replace function public.claim_sympla_alert(
  p_integration_id uuid,
  p_dead_letter_id uuid,
  p_dedupe_key text,
  p_alert_type text default 'sympla_sync_failed'
)
returns table(alert_id uuid, claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert_id uuid;
begin
  if p_alert_type not in ('sympla_sync_failed', 'sympla_health_peak', 'sympla_health_recovered') then
    raise exception 'Tipo de alerta inválido.';
  end if;

  insert into public.integration_alerts (
    integration_id, dead_letter_id, alert_type, dedupe_key
  ) values (
    p_integration_id, p_dead_letter_id, p_alert_type, p_dedupe_key
  )
  on conflict (integration_id, alert_type, dedupe_key) do update
    set dead_letter_id = excluded.dead_letter_id,
        status = 'processing',
        attempt_count = public.integration_alerts.attempt_count + 1,
        last_error = null,
        processing_started_at = now(),
        updated_at = now()
  where public.integration_alerts.status = 'failed'
     or (
       public.integration_alerts.status = 'processing'
       and public.integration_alerts.processing_started_at < now() - interval '10 minutes'
     )
  returning id into v_alert_id;

  if v_alert_id is not null then
    return query select v_alert_id, true;
    return;
  end if;

  select id into v_alert_id
    from public.integration_alerts
   where integration_id = p_integration_id
     and alert_type = p_alert_type
     and dedupe_key = p_dedupe_key;
  return query select v_alert_id, false;
end;
$$;

create or replace function public.get_sympla_integration_health()
returns table (
  integration_id uuid,
  provider text,
  open_dead_letters bigint,
  new_dead_letters_15m bigint,
  oldest_open_minutes numeric,
  failed_runs_1h bigint,
  total_runs_1h bigint
)
language sql
security definer
set search_path = public
as $$
  select
    ei.id,
    ei.provider,
    (select count(*) from public.event_sync_dead_letters dl where dl.integration_id = ei.id and dl.resolved_at is null),
    (select count(*) from public.event_sync_dead_letters dl where dl.integration_id = ei.id and dl.resolved_at is null and dl.created_at >= now() - interval '15 minutes'),
    coalesce((select extract(epoch from max(now() - dl.created_at)) / 60 from public.event_sync_dead_letters dl where dl.integration_id = ei.id and dl.resolved_at is null), 0),
    (select count(*) from public.event_sync_runs sr where sr.integration_id = ei.id and sr.started_at >= now() - interval '1 hour' and sr.status = 'failed'),
    (select count(*) from public.event_sync_runs sr where sr.integration_id = ei.id and sr.started_at >= now() - interval '1 hour')
  from public.event_integrations ei
  where ei.provider = 'sympla' and ei.is_enabled = true;
$$;

revoke all on function public.claim_sympla_alert(uuid, uuid, text, text), public.get_sympla_integration_health() from public, anon, authenticated;
grant execute on function public.claim_sympla_alert(uuid, uuid, text, text), public.get_sympla_integration_health() to service_role;

commit;
