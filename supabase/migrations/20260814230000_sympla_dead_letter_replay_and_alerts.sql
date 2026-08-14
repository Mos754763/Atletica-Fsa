begin;

create table if not exists public.integration_alerts (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  dead_letter_id uuid references public.event_sync_dead_letters(id) on delete set null,
  alert_type text not null check (alert_type in ('sympla_sync_failed')),
  dedupe_key text not null check (char_length(trim(dedupe_key)) between 12 and 180),
  status text not null default 'processing' check (status in ('processing', 'sent', 'failed', 'skipped')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  last_error text,
  processing_started_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id, alert_type, dedupe_key)
);

alter table public.event_sync_dead_letters
  add column if not exists replay_started_at timestamptz,
  add column if not exists replay_attempts integer not null default 0 check (replay_attempts >= 0),
  add column if not exists last_replay_run_id uuid references public.event_sync_runs(id) on delete set null;

create index if not exists integration_alerts_status_created_idx
  on public.integration_alerts(status, created_at desc);
create index if not exists event_sync_dead_letters_replay_open_idx
  on public.event_sync_dead_letters(integration_id, created_at desc)
  where resolved_at is null;

alter table public.integration_alerts enable row level security;

create policy "integration alerts: administrators read"
  on public.integration_alerts for select to authenticated
  using (public.is_admin());

create or replace function public.claim_sympla_dead_letter_replay(
  p_dead_letter_id uuid
)
returns table(integration_id uuid, claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_integration_id uuid;
begin
  update public.event_sync_dead_letters
     set replay_started_at = now(),
         replay_attempts = replay_attempts + 1
   where id = p_dead_letter_id
     and resolved_at is null
     and (
       replay_started_at is null
       or replay_started_at < now() - interval '10 minutes'
     )
  returning event_sync_dead_letters.integration_id into v_integration_id;

  if v_integration_id is not null then
    return query select v_integration_id, true;
    return;
  end if;

  select event_sync_dead_letters.integration_id into v_integration_id
    from public.event_sync_dead_letters
   where id = p_dead_letter_id;
  return query select v_integration_id, false;
end;
$$;

create or replace function public.finish_sympla_dead_letter_replay(
  p_dead_letter_id uuid,
  p_sync_run_id uuid,
  p_succeeded boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.event_sync_dead_letters
     set replay_started_at = null,
         last_replay_run_id = p_sync_run_id,
         resolved_at = case when p_succeeded then now() else resolved_at end,
         resolved_by = case when p_succeeded then auth.uid() else resolved_by end
   where id = p_dead_letter_id;
end;
$$;

create or replace function public.claim_sympla_alert(
  p_integration_id uuid,
  p_dead_letter_id uuid,
  p_dedupe_key text
)
returns table(alert_id uuid, claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert_id uuid;
begin
  insert into public.integration_alerts (
    integration_id, dead_letter_id, alert_type, dedupe_key
  ) values (
    p_integration_id, p_dead_letter_id, 'sympla_sync_failed', p_dedupe_key
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
     and alert_type = 'sympla_sync_failed'
     and dedupe_key = p_dedupe_key;
  return query select v_alert_id, false;
end;
$$;

create or replace function public.finish_sympla_alert(
  p_alert_id uuid,
  p_status text,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('sent', 'failed', 'skipped') then
    raise exception 'Status de alerta inválido.';
  end if;

  update public.integration_alerts
     set status = p_status,
         last_error = nullif(left(coalesce(p_error, ''), 600), ''),
         delivered_at = case when p_status = 'sent' then now() else delivered_at end,
         updated_at = now()
   where id = p_alert_id;
end;
$$;

revoke all on function public.claim_sympla_dead_letter_replay(uuid), public.finish_sympla_dead_letter_replay(uuid, uuid, boolean), public.claim_sympla_alert(uuid, uuid, text), public.finish_sympla_alert(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_sympla_dead_letter_replay(uuid), public.finish_sympla_dead_letter_replay(uuid, uuid, boolean), public.claim_sympla_alert(uuid, uuid, text), public.finish_sympla_alert(uuid, text, text) to service_role;

commit;
