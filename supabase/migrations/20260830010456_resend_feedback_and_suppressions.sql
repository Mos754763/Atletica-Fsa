-- Feedback de entrega do Resend, idempotência por svix-id e suppressions.
-- Migration aditiva e compatível com a versão anterior da aplicação.

alter table public.email_deliveries
  add column if not exists delivery_status text not null default 'accepted',
  add column if not exists delivered_at timestamptz,
  add column if not exists bounced_at timestamptz,
  add column if not exists complained_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists suppressed_at timestamptz,
  add column if not exists last_provider_event_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'email_deliveries_delivery_status_check'
      and conrelid = 'public.email_deliveries'::regclass
  ) then
    alter table public.email_deliveries
      add constraint email_deliveries_delivery_status_check
      check (delivery_status in ('accepted', 'delivered', 'bounced', 'complained', 'failed', 'suppressed'));
  end if;
end
$$;

create unique index if not exists email_deliveries_provider_message_id_key
  on public.email_deliveries(provider_message_id)
  where provider_message_id is not null;

create table if not exists public.email_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'resend' check (provider = 'resend'),
  event_id text not null,
  event_type text not null check (event_type in ('email.delivered', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed')),
  provider_message_id text not null,
  recipient_email text not null,
  occurred_at timestamptz not null,
  payload jsonb not null,
  status text not null default 'unmatched' check (status in ('unmatched', 'processed')),
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider, event_id)
);

create index if not exists email_webhook_events_message_idx
  on public.email_webhook_events(provider_message_id, occurred_at desc);
create index if not exists email_webhook_events_unmatched_idx
  on public.email_webhook_events(created_at)
  where status = 'unmatched';

create table if not exists public.email_suppressions (
  recipient_email text not null,
  reason text not null check (reason in ('hard_bounce', 'complaint', 'provider_suppressed')),
  active boolean not null default true,
  source_event_id text not null,
  first_seen_at timestamptz not null,
  last_seen_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipient_email, reason)
);

create index if not exists email_suppressions_active_recipient_idx
  on public.email_suppressions(recipient_email)
  where active;

alter table public.email_webhook_events enable row level security;
alter table public.email_suppressions enable row level security;

drop policy if exists "email webhook events: president reads" on public.email_webhook_events;
create policy "email webhook events: president reads"
  on public.email_webhook_events for select to authenticated
  using (public.is_president());

drop policy if exists "email suppressions: president reads" on public.email_suppressions;
create policy "email suppressions: president reads"
  on public.email_suppressions for select to authenticated
  using (public.is_president());

revoke all on table public.email_webhook_events, public.email_suppressions from public, anon, authenticated;
grant select on table public.email_webhook_events, public.email_suppressions to authenticated;
grant all on table public.email_webhook_events, public.email_suppressions to service_role;

create or replace function public.reconcile_resend_email_delivery(p_provider_message_id text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  delivered_time timestamptz;
  bounced_time timestamptz;
  complained_time timestamptz;
  failed_time timestamptz;
  suppressed_time timestamptz;
  latest_time timestamptz;
begin
  select id into target_id
  from public.email_deliveries
  where provider_message_id = p_provider_message_id
  for update;

  if not found then
    return false;
  end if;

  select
    max(occurred_at) filter (where event_type = 'email.delivered'),
    max(occurred_at) filter (where event_type = 'email.bounced'),
    max(occurred_at) filter (where event_type = 'email.complained'),
    max(occurred_at) filter (where event_type = 'email.failed'),
    max(occurred_at) filter (where event_type = 'email.suppressed'),
    max(occurred_at)
  into delivered_time, bounced_time, complained_time, failed_time, suppressed_time, latest_time
  from public.email_webhook_events
  where provider_message_id = p_provider_message_id;

  update public.email_deliveries
  set delivered_at = coalesce(greatest(delivered_at, delivered_time), delivered_at, delivered_time),
      bounced_at = coalesce(greatest(bounced_at, bounced_time), bounced_at, bounced_time),
      complained_at = coalesce(greatest(complained_at, complained_time), complained_at, complained_time),
      failed_at = coalesce(greatest(failed_at, failed_time), failed_at, failed_time),
      suppressed_at = coalesce(greatest(suppressed_at, suppressed_time), suppressed_at, suppressed_time),
      last_provider_event_at = coalesce(greatest(last_provider_event_at, latest_time), last_provider_event_at, latest_time),
      delivery_status = case
        when complained_time is not null then 'complained'
        when bounced_time is not null then 'bounced'
        when suppressed_time is not null then 'suppressed'
        when failed_time is not null then 'failed'
        when delivered_time is not null then 'delivered'
        else delivery_status
      end
  where id = target_id;

  update public.email_webhook_events
  set status = 'processed', processed_at = coalesce(processed_at, now())
  where provider_message_id = p_provider_message_id
    and status = 'unmatched';
  return true;
end;
$$;

create or replace function public.ingest_resend_email_event(
  p_event_id text,
  p_event_type text,
  p_provider_message_id text,
  p_occurred_at timestamptz,
  p_recipient_email text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id uuid;
  normalized_email text := lower(btrim(p_recipient_email));
  suppression_reason text;
  matched boolean := false;
begin
  if p_event_id is null or btrim(p_event_id) = ''
    or p_provider_message_id is null or btrim(p_provider_message_id) = ''
    or normalized_email = ''
    or p_event_type not in ('email.delivered', 'email.bounced', 'email.complained', 'email.failed', 'email.suppressed') then
    raise exception 'invalid resend webhook event';
  end if;

  insert into public.email_webhook_events (
    event_id, event_type, provider_message_id, recipient_email, occurred_at, payload
  ) values (
    p_event_id, p_event_type, p_provider_message_id, normalized_email, p_occurred_at, p_payload
  )
  on conflict (provider, event_id) do nothing
  returning id into inserted_id;

  if inserted_id is null then
    return jsonb_build_object('accepted', true, 'duplicate', true);
  end if;

  suppression_reason := case p_event_type
    when 'email.bounced' then 'hard_bounce'
    when 'email.complained' then 'complaint'
    when 'email.suppressed' then 'provider_suppressed'
    else null
  end;
  if suppression_reason is not null then
    insert into public.email_suppressions (
      recipient_email, reason, active, source_event_id, first_seen_at, last_seen_at
    ) values (
      normalized_email, suppression_reason, true, p_event_id, p_occurred_at, p_occurred_at
    )
    on conflict (recipient_email, reason) do update
    set active = true,
        source_event_id = excluded.source_event_id,
        first_seen_at = least(public.email_suppressions.first_seen_at, excluded.first_seen_at),
        last_seen_at = greatest(public.email_suppressions.last_seen_at, excluded.last_seen_at),
        updated_at = now();
  end if;

  matched := public.reconcile_resend_email_delivery(p_provider_message_id);
  return jsonb_build_object(
    'accepted', true,
    'duplicate', false,
    'matchedDelivery', matched,
    'suppressed', suppression_reason is not null
  );
end;
$$;

-- Recriada para reconciliar eventos que eventualmente cheguem antes da gravação
-- da entrega, preservando a finalização atômica da migration anterior.
create or replace function public.finish_email_outbox_delivery(
  p_outbox_id uuid,
  p_provider_message_id text,
  p_sent_at timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed public.email_outbox%rowtype;
begin
  if p_provider_message_id is null or btrim(p_provider_message_id) = '' then
    raise exception 'provider_message_id is required';
  end if;

  update public.email_outbox
  set status = 'sent', sent_at = p_sent_at, provider_message_id = p_provider_message_id,
      locked_at = null, last_error = null, updated_at = now()
  where id = p_outbox_id and status = 'processing'
  returning * into claimed;
  if not found then return false; end if;

  insert into public.email_deliveries (
    outbox_id, recipient_email, recipient_profile_id, template_key,
    related_order_id, related_registration_id, provider_message_id, sent_at, delivery_status
  ) values (
    claimed.id, claimed.recipient_email, claimed.recipient_profile_id, claimed.template_key,
    claimed.related_order_id, claimed.related_registration_id, p_provider_message_id, p_sent_at, 'accepted'
  ) on conflict do nothing;

  perform public.reconcile_resend_email_delivery(p_provider_message_id);
  return true;
end;
$$;

revoke all on function public.reconcile_resend_email_delivery(text) from public, anon, authenticated;
revoke all on function public.ingest_resend_email_event(text, text, text, timestamptz, text, jsonb) from public, anon, authenticated;
revoke all on function public.finish_email_outbox_delivery(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.ingest_resend_email_event(text, text, text, timestamptz, text, jsonb) to service_role;
grant execute on function public.finish_email_outbox_delivery(uuid, text, timestamptz) to service_role;

comment on function public.ingest_resend_email_event(text, text, text, timestamptz, text, jsonb)
  is 'Persiste feedback assinado do Resend de forma idempotente e atualiza suppressions/entregas.';
