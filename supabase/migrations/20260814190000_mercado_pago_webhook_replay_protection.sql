begin;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('mercado_pago')),
  event_key text not null,
  payment_reference text not null,
  request_id text,
  signature_timestamp bigint not null,
  status text not null default 'processing' check (status in ('processing', 'succeeded', 'ignored', 'rejected', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  processing_started_at timestamptz not null default now(),
  processed_at timestamptz,
  error_code text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider, event_key)
);

create index if not exists payment_webhook_events_status_created_idx on public.payment_webhook_events(status, created_at desc);
create index if not exists payment_webhook_events_payment_reference_idx on public.payment_webhook_events(provider, payment_reference);
alter table public.payment_webhook_events enable row level security;

create or replace function public.claim_payment_webhook_event(
  p_provider text,
  p_event_key text,
  p_payment_reference text,
  p_request_id text,
  p_signature_timestamp bigint,
  p_payload jsonb default '{}'::jsonb
)
returns table(event_id uuid, claimed boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if p_provider <> 'mercado_pago' or p_event_key = '' or p_payment_reference = '' then
    raise exception 'Evento de pagamento inválido.';
  end if;

  insert into public.payment_webhook_events (
    provider, event_key, payment_reference, request_id, signature_timestamp, payload
  ) values (
    p_provider, p_event_key, p_payment_reference, nullif(p_request_id, ''), p_signature_timestamp, coalesce(p_payload, '{}'::jsonb)
  )
  on conflict (provider, event_key) do update
    set status = 'processing',
        attempt_count = public.payment_webhook_events.attempt_count + 1,
        processing_started_at = now(),
        processed_at = null,
        error_code = null,
        payload = excluded.payload,
        request_id = excluded.request_id,
        updated_at = now()
    where public.payment_webhook_events.status = 'failed'
       or (
         public.payment_webhook_events.status = 'processing'
         and public.payment_webhook_events.processing_started_at < now() - interval '10 minutes'
       )
  returning id into v_event_id;

  if v_event_id is not null then
    return query select v_event_id, true;
    return;
  end if;

  select id into v_event_id
    from public.payment_webhook_events
   where provider = p_provider and event_key = p_event_key;
  return query select v_event_id, false;
end;
$$;

revoke all on function public.claim_payment_webhook_event(text, text, text, text, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.claim_payment_webhook_event(text, text, text, text, bigint, jsonb) to service_role;

commit;
