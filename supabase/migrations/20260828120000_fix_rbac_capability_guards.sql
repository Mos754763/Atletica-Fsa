begin;

-- current_role() permanece disponível apenas para compatibilidade com código
-- legado e apresentação. Autorização deve consultar a atribuição requerida com
-- has_any_role(), sem promover papéis operacionais a admin.
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select assignment.role
      from public.profile_role_assignments assignment
      where assignment.profile_id = auth.uid()
      order by case assignment.role
        when 'admin' then 1
        when 'caixa' then 2
        when 'backoffice' then 3
        else 4
      end
      limit 1
    ),
    'cliente'::public.user_role
  )
$$;

create or replace function public.advance_ods_order(p_order_id uuid, p_next_status public.order_status)
returns table(order_id uuid, final_status public.order_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.has_any_role(array['admin', 'backoffice']::public.user_role[]) then
    raise exception 'Permissão insuficiente para operar pedidos.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não localizado.'; end if;
  if p_next_status = 'em_preparo' and v_order.status = 'pago' then
    update public.orders set status = 'em_preparo', updated_at = now() where id = v_order.id;
  elsif p_next_status = 'pronto' and v_order.status = 'em_preparo' then
    update public.orders set status = 'pronto', ready_at = now(), updated_at = now() where id = v_order.id;
  elsif p_next_status = 'entregue' then
    raise exception 'A entrega de retirada exige confirmação pelo QR Code.';
  else
    raise exception 'Transição de pedido inválida.';
  end if;

  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, p_next_status, auth.uid(), 'Atualização operacional atômica pelo ODS.');
  return query select v_order.id, p_next_status;
end;
$$;

create or replace function public.confirm_order_pickup_by_qr(p_order_id uuid, p_pickup_qr_token uuid)
returns table(order_id uuid, final_status public.order_status, already_picked_up boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if not public.has_any_role(array['admin', 'backoffice']::public.user_role[]) then
    raise exception 'Permissão insuficiente para confirmar retirada.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não localizado.'; end if;
  if v_order.fulfillment <> 'retirada' then raise exception 'Este pedido não é elegível para retirada.'; end if;
  if v_order.status = 'entregue' or v_order.picked_up_at is not null then
    return query select v_order.id, 'entregue'::public.order_status, true;
    return;
  end if;
  if v_order.status <> 'pronto' then raise exception 'Pedido ainda não está pronto para retirada.'; end if;
  if v_order.pickup_qr_token is null or v_order.pickup_qr_token is distinct from p_pickup_qr_token then
    raise exception 'QR Code de retirada inválido.';
  end if;
  if v_order.pickup_qr_expires_at is null or v_order.pickup_qr_expires_at <= now() then
    raise exception 'QR Code de retirada expirado. Gere um novo token para o cliente.';
  end if;

  update public.orders
     set status = 'entregue',
         picked_up_at = now(),
         picked_up_by = auth.uid(),
         pickup_qr_token = null,
         pickup_qr_expires_at = null,
         updated_at = now()
   where id = v_order.id;
  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, 'entregue', auth.uid(), 'Retirada confirmada por QR Code opaco de uso único.');
  return query select v_order.id, 'entregue'::public.order_status, false;
end;
$$;

create or replace function public.renew_order_pickup_qr(p_order_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_expiry timestamptz := now() + interval '48 hours';
begin
  if not public.has_any_role(array['admin', 'backoffice']::public.user_role[]) then
    raise exception 'Permissão insuficiente para renovar o QR Code.';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não localizado.'; end if;
  if v_order.status <> 'pronto' or v_order.fulfillment <> 'retirada' or v_order.picked_up_at is not null then
    raise exception 'Somente pedidos prontos para retirada podem receber novo QR Code.';
  end if;
  update public.orders
     set pickup_qr_token = gen_random_uuid(), pickup_qr_expires_at = v_expiry, updated_at = now()
   where id = v_order.id;
  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, v_order.status, auth.uid(), 'QR Code de retirada renovado pelo Backoffice.');
  return v_expiry;
end;
$$;

create or replace function public.check_in_event_ticket(p_check_in_code text)
returns table(registration_id uuid, final_status public.registration_status, already_checked_in boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_registration public.event_registrations%rowtype;
  v_ticket public.event_tickets%rowtype;
begin
  if not public.has_any_role(array['admin', 'caixa']::public.user_role[]) then
    raise exception 'Permissão insuficiente';
  end if;
  select * into v_registration from public.event_registrations where check_in_code = upper(trim(p_check_in_code)) for update;
  if not found then raise exception 'Inscrição não localizada'; end if;
  if v_registration.status = 'check_in_realizado' then return query select v_registration.id, v_registration.status, true; return; end if;
  if v_registration.status <> 'confirmada' then raise exception 'Ingresso ainda não está confirmado'; end if;
  select * into v_ticket from public.event_tickets as ticket where ticket.registration_id = v_registration.id for update;
  if not found or v_ticket.status <> 'emitido' then raise exception 'Ingresso indisponível para check-in'; end if;
  update public.event_registrations set status = 'check_in_realizado', checked_in_at = now(), checked_in_by = auth.uid(), updated_at = now() where id = v_registration.id;
  update public.event_tickets set status = 'usado', used_at = now(), updated_at = now() where id = v_ticket.id;
  return query select v_registration.id, 'check_in_realizado'::public.registration_status, false;
end;
$$;

revoke all on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;

revoke all on function public.advance_ods_order(uuid, public.order_status) from public, anon;
grant execute on function public.advance_ods_order(uuid, public.order_status) to authenticated;
revoke all on function public.confirm_order_pickup_by_qr(uuid, uuid) from public, anon;
grant execute on function public.confirm_order_pickup_by_qr(uuid, uuid) to authenticated;
revoke all on function public.renew_order_pickup_qr(uuid) from public, anon;
grant execute on function public.renew_order_pickup_qr(uuid) to authenticated;
revoke all on function public.check_in_event_ticket(text) from public, anon;
grant execute on function public.check_in_event_ticket(text) to authenticated;

commit;
