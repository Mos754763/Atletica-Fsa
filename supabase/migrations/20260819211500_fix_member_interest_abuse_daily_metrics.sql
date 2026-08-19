begin;

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
    days.metric_day::date,
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

revoke all on function public.get_member_interest_abuse_daily_metrics(integer) from public, anon, authenticated;
grant execute on function public.get_member_interest_abuse_daily_metrics(integer) to authenticated;

commit;
