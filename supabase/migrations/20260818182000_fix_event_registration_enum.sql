-- Corrige a coerção explícita do enum de inscrição dentro do CASE da RPC.
-- Sem esse cast, PostgreSQL rejeita a emissão de qualquer inscrição (inclusive gratuita)
-- com SQLSTATE 42804 antes de gravar a inscrição e o ingresso.
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
  values (
    p_event_id,
    v_user,
    coalesce(v_profile.display_name, v_profile.email, 'Torcida FSA'),
    v_profile.email,
    v_amount,
    case
      when v_amount > 0 then 'pendente'::public.registration_status
      else 'confirmada'::public.registration_status
    end,
    p_ticket_lot_id
  )
  returning * into v_registration;

  insert into public.event_tickets(registration_id, event_id, ticket_lot_id, recipient_profile_id, status)
  values (v_registration.id, p_event_id, p_ticket_lot_id, v_user, case when v_amount > 0 then 'pendente_pagamento' else 'emitido' end)
  returning * into v_ticket;

  return query select v_registration.id, v_registration.check_in_code, v_ticket.id, v_ticket.qr_token, v_amount, v_amount > 0;
end;
$$;

grant execute on function public.create_event_registration_ticket(uuid, uuid) to authenticated;
