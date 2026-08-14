begin;

-- O QR só existe enquanto a retirada estiver pronta. O token UUID é opaco ao usuário
-- e é invalidado no mesmo commit que registra a retirada.
alter table public.orders add column if not exists pickup_qr_expires_at timestamptz;
alter table public.orders alter column pickup_qr_token drop default;

update public.orders
   set pickup_qr_token = gen_random_uuid(),
       pickup_qr_expires_at = now() + interval '48 hours'
 where status = 'pronto'
   and fulfillment = 'retirada'
   and picked_up_at is null;

update public.orders
   set pickup_qr_token = null,
       pickup_qr_expires_at = null
 where status <> 'pronto'
    or fulfillment <> 'retirada'
    or picked_up_at is not null;

create index if not exists orders_pickup_qr_active_idx
  on public.orders (pickup_qr_token, pickup_qr_expires_at)
  where status = 'pronto' and fulfillment = 'retirada' and picked_up_at is null;

drop policy if exists "orders: staff updates" on public.orders;

create or replace function public.prepare_order_pickup_qr()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'pronto' and new.fulfillment = 'retirada' and old.status is distinct from 'pronto' then
    new.pickup_qr_token := gen_random_uuid();
    new.pickup_qr_expires_at := now() + interval '48 hours';
  elsif new.status <> 'pronto' or new.fulfillment <> 'retirada' or new.picked_up_at is not null then
    new.pickup_qr_token := null;
    new.pickup_qr_expires_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_prepare_pickup_qr on public.orders;
create trigger orders_prepare_pickup_qr
before update of status, fulfillment, picked_up_at on public.orders
for each row execute procedure public.prepare_order_pickup_qr();

create or replace function public.advance_ods_order(p_order_id uuid, p_next_status public.order_status)
returns table(order_id uuid, final_status public.order_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if public.current_role() not in ('admin', 'cozinha') then
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
  if public.current_role() not in ('admin', 'cozinha') then
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
  if public.current_role() not in ('admin', 'cozinha') then
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

-- Grants de tabelas sempre pertencem ao setor proprietário da tabela.
create or replace function public.validate_table_permission_grant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table_id uuid;
  v_sector_id uuid;
begin
  if new.resource_key = 'table:*' then
    if new.sector_id is null then
      raise exception 'A concessão table:* exige um setor específico.';
    end if;
  elsif new.resource_key like 'table:%' then
    begin
      v_table_id := substring(new.resource_key from 7)::uuid;
    exception when invalid_text_representation then
      raise exception 'O escopo de tabela deve usar table:* ou table:<uuid>.';
    end;
    select sector_id into v_sector_id from public.custom_tables where id = v_table_id and deleted_at is null;
    if v_sector_id is null then raise exception 'A tabela indicada na concessão não existe.'; end if;
    if new.sector_id is distinct from v_sector_id then
      raise exception 'A concessão de tabela deve usar o setor proprietário da tabela.';
    end if;
  end if;
  return new;
end;
$$;

update public.permission_grants g
   set sector_id = t.sector_id
  from public.custom_tables t
 where g.resource_key = 'table:' || t.id::text
   and g.sector_id is null
   and g.revoked_at is null;

drop trigger if exists permission_grants_validate_table_scope on public.permission_grants;
create trigger permission_grants_validate_table_scope
before insert or update of resource_key, sector_id on public.permission_grants
for each row execute procedure public.validate_table_permission_grant();

create or replace function public.can_table_action(p_table_id uuid, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_president() or exists (
    select 1 from public.custom_tables t join public.sector_memberships sm on sm.sector_id = t.sector_id
    where t.id = p_table_id and sm.profile_id = auth.uid() and sm.ended_at is null and sm.role = 'diretor'
  ) or exists (
    select 1 from public.custom_tables t join public.permission_grants g on g.profile_id = auth.uid()
    where t.id = p_table_id and g.revoked_at is null and g.action::text = p_action and g.sector_id = t.sector_id
      and g.resource_key in ('table:*', 'table:' || p_table_id::text)
  );
$$;

create or replace function public.audit_custom_builder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_sector uuid;
  actor uuid := auth.uid();
  audit_action text;
begin
  if tg_op = 'INSERT' then
    if tg_table_name = 'custom_tables' then
      row_sector := new.sector_id;
    else
      select sector_id into row_sector from public.custom_tables where id = new.table_id;
    end if;
    audit_action := 'create';
    insert into public.audit_logs(sector_id, entity_type, entity_id, action, before_json, after_json, actor_id)
    values (row_sector, tg_table_name, new.id, audit_action, null, to_jsonb(new), actor);
    return new;
  elsif tg_op = 'DELETE' then
    if tg_table_name = 'custom_tables' then
      row_sector := old.sector_id;
    else
      select sector_id into row_sector from public.custom_tables where id = old.table_id;
    end if;
    audit_action := 'delete';
    insert into public.audit_logs(sector_id, entity_type, entity_id, action, before_json, after_json, actor_id)
    values (row_sector, tg_table_name, old.id, audit_action, to_jsonb(old), null, actor);
    return old;
  elsif tg_table_name = 'custom_tables' then
    row_sector := new.sector_id;
  else
    select sector_id into row_sector from public.custom_tables where id = new.table_id;
  end if;
  audit_action := 'update';
  insert into public.audit_logs(sector_id, entity_type, entity_id, action, before_json, after_json, actor_id)
  values (row_sector, tg_table_name, new.id, audit_action, to_jsonb(old), to_jsonb(new), actor);
  return new;
end;
$$;

revoke all on function public.advance_ods_order(uuid, public.order_status) from public, anon;
grant execute on function public.advance_ods_order(uuid, public.order_status) to authenticated;
revoke all on function public.confirm_order_pickup_by_qr(uuid, uuid) from public, anon;
grant execute on function public.confirm_order_pickup_by_qr(uuid, uuid) to authenticated;
revoke all on function public.renew_order_pickup_qr(uuid) from public, anon;
grant execute on function public.renew_order_pickup_qr(uuid) to authenticated;

commit;
