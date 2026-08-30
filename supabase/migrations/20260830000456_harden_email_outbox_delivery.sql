-- Finaliza outbox + trilha de entrega na mesma transação.
-- A ativação do worker frequente permanece separada desta migration para
-- preservar o ambiente atual até que a rota candidata esteja validada.

alter table public.email_deliveries
  add column if not exists outbox_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'email_deliveries_outbox_id_fkey'
      and conrelid = 'public.email_deliveries'::regclass
  ) then
    alter table public.email_deliveries
      add constraint email_deliveries_outbox_id_fkey
      foreign key (outbox_id) references public.email_outbox(id) on delete restrict;
  end if;
end
$$;

create unique index if not exists email_deliveries_outbox_id_key
  on public.email_deliveries(outbox_id)
  where outbox_id is not null;

create unique index if not exists email_deliveries_provider_message_id_key
  on public.email_deliveries(provider_message_id)
  where provider_message_id is not null;

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

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('resend-message:' || p_provider_message_id, 0)
  );

  update public.email_outbox
  set status = 'sent',
      sent_at = p_sent_at,
      provider_message_id = p_provider_message_id,
      locked_at = null,
      last_error = null,
      updated_at = now()
  where id = p_outbox_id
    and status = 'processing'
  returning * into claimed;

  if not found then
    return false;
  end if;

  insert into public.email_deliveries (
    outbox_id,
    recipient_email,
    recipient_profile_id,
    template_key,
    related_order_id,
    related_registration_id,
    provider_message_id,
    sent_at
  ) values (
    claimed.id,
    claimed.recipient_email,
    claimed.recipient_profile_id,
    claimed.template_key,
    claimed.related_order_id,
    claimed.related_registration_id,
    p_provider_message_id,
    p_sent_at
  );

  return true;
end;
$$;

revoke all on function public.finish_email_outbox_delivery(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.finish_email_outbox_delivery(uuid, text, timestamptz) to service_role;

comment on function public.finish_email_outbox_delivery(uuid, text, timestamptz)
  is 'Finaliza uma mensagem reivindicada e registra sua entrega atomicamente; uso exclusivo do worker service_role.';
