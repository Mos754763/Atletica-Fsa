-- Ingressos por lote, emissão de QR e transferência segura.
create table if not exists public.event_ticket_lots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 120),
  description text,
  price_cents integer not null check (price_cents >= 0),
  quantity_total integer not null check (quantity_total > 0),
  quantity_sold integer not null default 0 check (quantity_sold >= 0 and quantity_sold <= quantity_total),
  max_per_customer integer not null default 1 check (max_per_customer between 1 and 10),
  sales_start_at timestamptz,
  sales_end_at timestamptz,
  is_active boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (sales_end_at is null or sales_start_at is null or sales_end_at > sales_start_at)
);

create index if not exists event_ticket_lots_event_active_idx on public.event_ticket_lots(event_id, is_active, sales_start_at, sales_end_at);
drop trigger if exists event_ticket_lots_set_updated_at on public.event_ticket_lots;
create trigger event_ticket_lots_set_updated_at before update on public.event_ticket_lots for each row execute procedure public.set_updated_at();

alter table public.event_registrations add column if not exists ticket_lot_id uuid references public.event_ticket_lots(id) on delete set null;

create table if not exists public.event_tickets (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.event_registrations(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_lot_id uuid references public.event_ticket_lots(id) on delete set null,
  recipient_profile_id uuid not null references public.profiles(id) on delete restrict,
  transferred_from_profile_id uuid references public.profiles(id) on delete set null,
  qr_token uuid not null unique default gen_random_uuid(),
  status text not null default 'pendente_pagamento' check (status in ('pendente_pagamento','emitido','usado','cancelado')),
  transferred_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists event_tickets_recipient_idx on public.event_tickets(recipient_profile_id, created_at desc);
create index if not exists event_tickets_event_status_idx on public.event_tickets(event_id, status);
drop trigger if exists event_tickets_set_updated_at on public.event_tickets;
create trigger event_tickets_set_updated_at before update on public.event_tickets for each row execute procedure public.set_updated_at();

create or replace function public.create_event_registration_ticket(p_event_id uuid, p_ticket_lot_id uuid default null)
returns table(registration_id uuid, check_in_code text, ticket_id uuid, ticket_qr_token uuid, amount_cents integer, payment_required boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_event public.events%rowtype;
  v_lot public.event_ticket_lots%rowtype;
  v_profile public.profiles%rowtype;
  v_registration public.event_registrations%rowtype;
  v_ticket public.event_tickets%rowtype;
  v_amount integer;
  v_count integer;
begin
  if v_user is null then raise exception 'Autenticação obrigatória'; end if;
  select * into v_profile from public.profiles where id = v_user;
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status <> 'inscricoes_abertas' or not v_event.requires_registration then raise exception 'Inscrição indisponível'; end if;
  if exists(select 1 from public.event_registrations where event_id = p_event_id and customer_id = v_user) then raise exception 'Inscrição já existe'; end if;
  select count(*) into v_count from public.event_registrations where event_id = p_event_id and status in ('pendente','confirmada','check_in_realizado');
  if v_event.capacity is not null and v_count >= v_event.capacity then raise exception 'Evento lotado'; end if;

  if p_ticket_lot_id is not null then
    select * into v_lot from public.event_ticket_lots where id = p_ticket_lot_id and event_id = p_event_id for update;
    if not found or not v_lot.is_active or (v_lot.sales_start_at is not null and v_lot.sales_start_at > now()) or (v_lot.sales_end_at is not null and v_lot.sales_end_at <= now()) then raise exception 'Lote indisponível'; end if;
    if v_lot.quantity_sold >= v_lot.quantity_total then raise exception 'Lote esgotado'; end if;
    v_amount := v_lot.price_cents;
    update public.event_ticket_lots set quantity_sold = quantity_sold + 1 where id = v_lot.id;
  else
    v_amount := v_event.registration_price_cents;
  end if;

  insert into public.event_registrations(event_id, customer_id, attendee_name, attendee_email, amount_cents, status, ticket_lot_id)
  values (p_event_id, v_user, coalesce(v_profile.display_name, v_profile.email, 'Torcida FSA'), v_profile.email, v_amount, case when v_amount > 0 then 'pendente' else 'confirmada' end, p_ticket_lot_id)
  returning * into v_registration;

  insert into public.event_tickets(registration_id, event_id, ticket_lot_id, recipient_profile_id, status)
  values (v_registration.id, p_event_id, p_ticket_lot_id, v_user, case when v_amount > 0 then 'pendente_pagamento' else 'emitido' end)
  returning * into v_ticket;

  return query select v_registration.id, v_registration.check_in_code, v_ticket.id, v_ticket.qr_token, v_amount, v_amount > 0;
end;
$$;

create or replace function public.settle_paid_event_ticket(p_registration_id uuid, p_provider_reference text, p_amount_cents integer, p_provider_payload jsonb default '{}'::jsonb)
returns table(transitioned boolean, final_status public.registration_status, ticket_status text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.event_registrations%rowtype;
  v_ticket public.event_tickets%rowtype;
  v_changed boolean := false;
begin
  select * into v_registration from public.event_registrations where id = p_registration_id for update;
  if not found then raise exception 'Inscrição não localizada'; end if;
  if v_registration.amount_cents <> p_amount_cents then raise exception 'Valor divergente'; end if;
  select * into v_ticket from public.event_tickets where registration_id = p_registration_id for update;
  insert into public.payments(registration_id, method, status, provider_reference, amount_cents, provider_payload, approved_at)
  values (p_registration_id, 'mercado_pago_checkout', 'aprovado', p_provider_reference, p_amount_cents, p_provider_payload, now())
  on conflict (provider_reference) do update set status = excluded.status, provider_payload = excluded.provider_payload, approved_at = coalesce(public.payments.approved_at, excluded.approved_at), updated_at = now();
  if v_registration.status = 'pendente' then
    update public.event_registrations set status = 'confirmada', updated_at = now() where id = p_registration_id;
    update public.event_tickets set status = 'emitido', updated_at = now() where registration_id = p_registration_id;
    v_changed := true;
  end if;
  return query select v_changed, case when v_changed then 'confirmada'::public.registration_status else v_registration.status end, case when v_changed then 'emitido' else coalesce(v_ticket.status, 'emitido') end;
end;
$$;

create or replace function public.transfer_event_ticket(p_ticket_id uuid, p_recipient_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender uuid := auth.uid();
  v_ticket public.event_tickets%rowtype;
  v_recipient uuid;
begin
  if v_sender is null then raise exception 'Autenticação obrigatória'; end if;
  select * into v_ticket from public.event_tickets where id = p_ticket_id for update;
  if not found or v_ticket.recipient_profile_id <> v_sender then raise exception 'Ingresso não disponível para transferência'; end if;
  if v_ticket.status <> 'emitido' then raise exception 'Somente ingressos emitidos podem ser transferidos'; end if;
  select id into v_recipient from public.profiles where lower(email) = lower(trim(p_recipient_email));
  if v_recipient is null or v_recipient = v_sender then raise exception 'Destinatário inválido'; end if;
  if exists(select 1 from public.event_registrations where event_id = v_ticket.event_id and customer_id = v_recipient) then raise exception 'O destinatário já possui inscrição neste evento'; end if;
  update public.event_registrations set customer_id = v_recipient, attendee_name = (select coalesce(display_name, email) from public.profiles where id = v_recipient), attendee_email = (select email from public.profiles where id = v_recipient), updated_at = now() where id = v_ticket.registration_id;
  update public.event_tickets set recipient_profile_id = v_recipient, transferred_from_profile_id = v_sender, transferred_at = now(), updated_at = now() where id = p_ticket_id;
  return v_recipient;
end;
$$;

alter table public.event_ticket_lots enable row level security;
alter table public.event_tickets enable row level security;
grant select on public.event_ticket_lots to anon, authenticated;
grant select on public.event_tickets to authenticated;
grant execute on function public.create_event_registration_ticket(uuid, uuid) to authenticated;
grant execute on function public.transfer_event_ticket(uuid, text) to authenticated;

drop policy if exists event_ticket_lots_public_read on public.event_ticket_lots;
create policy event_ticket_lots_public_read on public.event_ticket_lots for select using (is_active or public.is_admin());
drop policy if exists event_tickets_owner_read on public.event_tickets;
create policy event_tickets_owner_read on public.event_tickets for select using (recipient_profile_id = auth.uid() or public.is_admin());
