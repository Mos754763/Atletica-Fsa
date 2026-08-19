begin;

create table if not exists public.member_interest_rate_limits (
  ip_hash text not null check (char_length(ip_hash) = 64),
  window_started_at timestamptz not null,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (ip_hash, window_started_at)
);

create table if not exists public.member_interest_abuse_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('honeypot', 'rate_limited', 'validation_rejected', 'persistence_failed')),
  ip_hash text not null check (char_length(ip_hash) = 64),
  source text not null default 'landing' check (source in ('landing')),
  details_json jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now()
);

create index if not exists member_interest_abuse_events_observed_idx
  on public.member_interest_abuse_events(observed_at desc);
create index if not exists member_interest_abuse_events_type_observed_idx
  on public.member_interest_abuse_events(event_type, observed_at desc);
create index if not exists member_interest_rate_limits_updated_idx
  on public.member_interest_rate_limits(updated_at asc);

alter table public.member_interest_rate_limits enable row level security;
alter table public.member_interest_abuse_events enable row level security;

revoke all on table public.member_interest_rate_limits, public.member_interest_abuse_events from public, anon, authenticated;

create or replace function public.consume_member_interest_rate_limit(
  p_ip_hash text,
  p_window_started_at timestamptz,
  p_limit integer default 10
)
returns table(attempt_count integer, allowed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempt_count integer;
  v_window_started_at timestamptz;
begin
  if char_length(p_ip_hash) <> 64 then
    raise exception 'Identificador de origem inválido.' using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 100 then
    raise exception 'Limite de tentativas inválido.' using errcode = '22023';
  end if;

  v_window_started_at := date_trunc('hour', p_window_started_at);
  insert into public.member_interest_rate_limits (ip_hash, window_started_at, attempt_count, updated_at)
  values (p_ip_hash, v_window_started_at, 1, now())
  on conflict (ip_hash, window_started_at) do update
    set attempt_count = public.member_interest_rate_limits.attempt_count + 1,
        updated_at = now()
  returning member_interest_rate_limits.attempt_count into v_attempt_count;

  return query select v_attempt_count, v_attempt_count <= p_limit;
end;
$$;

create or replace function public.get_member_interest_abuse_summary()
returns table(
  events_24h bigint,
  honeypot_24h bigint,
  rate_limited_24h bigint,
  validation_rejected_24h bigint,
  distinct_sources_24h bigint,
  last_event_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_president() then
    raise exception 'Acesso restrito à Presidência.' using errcode = '42501';
  end if;

  return query
  select
    count(*) filter (where observed_at >= now() - interval '24 hours'),
    count(*) filter (where event_type = 'honeypot' and observed_at >= now() - interval '24 hours'),
    count(*) filter (where event_type = 'rate_limited' and observed_at >= now() - interval '24 hours'),
    count(*) filter (where event_type = 'validation_rejected' and observed_at >= now() - interval '24 hours'),
    count(distinct ip_hash) filter (where observed_at >= now() - interval '24 hours'),
    max(observed_at)
  from public.member_interest_abuse_events;
end;
$$;

create or replace function public.get_member_interest_abuse_daily_metrics(p_days integer default 7)
returns table(
  metric_day date,
  honeypot_count bigint,
  rate_limited_count bigint,
  validation_rejected_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_president() then
    raise exception 'Acesso restrito à Presidência.' using errcode = '42501';
  end if;
  if p_days < 1 or p_days > 30 then
    raise exception 'Janela de métricas inválida.' using errcode = '22023';
  end if;

  return query
  select
    days.metric_day,
    count(events.id) filter (where events.event_type = 'honeypot'),
    count(events.id) filter (where events.event_type = 'rate_limited'),
    count(events.id) filter (where events.event_type = 'validation_rejected')
  from generate_series(current_date - (p_days - 1), current_date, interval '1 day') as days(metric_day)
  left join public.member_interest_abuse_events events
    on events.observed_at >= days.metric_day
   and events.observed_at < days.metric_day + interval '1 day'
  group by days.metric_day
  order by days.metric_day asc;
end;
$$;

create or replace function public.cleanup_member_interest_abuse_data(
  p_event_retention_days integer default 30,
  p_counter_retention_hours integer default 2
)
returns table(deleted_events bigint, deleted_rate_limit_windows bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_events bigint;
  v_deleted_windows bigint;
begin
  if p_event_retention_days < 1 or p_event_retention_days > 365 then
    raise exception 'Retenção de eventos inválida.' using errcode = '22023';
  end if;
  if p_counter_retention_hours < 1 or p_counter_retention_hours > 168 then
    raise exception 'Retenção de contadores inválida.' using errcode = '22023';
  end if;

  delete from public.member_interest_abuse_events
   where observed_at < now() - make_interval(days => p_event_retention_days);
  get diagnostics v_deleted_events = row_count;

  delete from public.member_interest_rate_limits
   where updated_at < now() - make_interval(hours => p_counter_retention_hours);
  get diagnostics v_deleted_windows = row_count;

  return query select v_deleted_events, v_deleted_windows;
end;
$$;

revoke all on function public.consume_member_interest_rate_limit(text, timestamptz, integer), public.get_member_interest_abuse_summary(), public.get_member_interest_abuse_daily_metrics(integer), public.cleanup_member_interest_abuse_data(integer, integer) from public, anon, authenticated;
grant execute on function public.consume_member_interest_rate_limit(text, timestamptz, integer), public.cleanup_member_interest_abuse_data(integer, integer) to service_role;
grant execute on function public.get_member_interest_abuse_summary(), public.get_member_interest_abuse_daily_metrics(integer) to authenticated;

commit;
