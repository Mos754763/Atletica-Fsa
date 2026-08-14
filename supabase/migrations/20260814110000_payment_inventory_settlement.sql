begin;

alter table public.orders
  add column if not exists inventory_committed_at timestamptz;

create or replace function public.settle_paid_order_inventory(p_order_id uuid)
returns table(
  transitioned boolean,
  final_status public.order_status,
  failure_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  order_line record;
  locked_product record;
begin
  select *
    into current_order
    from public.orders
   where id = p_order_id
   for update;

  if not found then
    raise exception 'Pedido % não localizado para liquidação de estoque.', p_order_id;
  end if;

  if current_order.inventory_committed_at is not null then
    return query select false, current_order.status, null::text;
    return;
  end if;

  if current_order.status <> 'aguardando_pagamento' then
    return query select false, current_order.status, 'order_not_pending'::text;
    return;
  end if;

  -- Trava todos os produtos em ordem determinística e só confirma se o pedido inteiro puder ser atendido.
  for order_line in
    select product_id, quantity, product_name
      from public.order_items
     where order_id = p_order_id
     order by product_id nulls first
  loop
    if order_line.product_id is null then
      update public.orders
         set status = 'cancelado',
             notes = concat_ws(E'\n', notes, 'Pagamento aprovado sem referência de produto; estorno manual necessário.'),
             updated_at = now()
       where id = p_order_id;
      insert into public.order_status_history(order_id, status, note)
      values (p_order_id, 'cancelado', 'Pagamento aprovado sem produto associado; pedido bloqueado para estorno manual.');
      return query select true, 'cancelado'::public.order_status, 'missing_product_reference'::text;
      return;
    end if;

    select id, stock_quantity, is_active
      into locked_product
      from public.products
     where id = order_line.product_id
     for update;

    if not found or not locked_product.is_active or locked_product.stock_quantity < order_line.quantity then
      update public.orders
         set status = 'cancelado',
             notes = concat_ws(E'\n', notes, 'Pagamento aprovado sem estoque disponível; estorno manual necessário.'),
             updated_at = now()
       where id = p_order_id;
      insert into public.order_status_history(order_id, status, note)
      values (p_order_id, 'cancelado', 'Pagamento aprovado sem estoque suficiente; pedido bloqueado para estorno manual.');
      return query select true, 'cancelado'::public.order_status, 'stock_unavailable'::text;
      return;
    end if;
  end loop;

  for order_line in
    select product_id, quantity
      from public.order_items
     where order_id = p_order_id
     order by product_id nulls first
  loop
    update public.products
       set stock_quantity = stock_quantity - order_line.quantity,
           updated_at = now()
     where id = order_line.product_id;

    insert into public.inventory_movements(product_id, quantity_delta, reason, reference_type, reference_id)
    values (order_line.product_id, -order_line.quantity, 'Baixa automática por pagamento aprovado', 'order', p_order_id);
  end loop;

  update public.orders
     set status = 'pago',
         paid_at = now(),
         inventory_committed_at = now(),
         updated_at = now()
   where id = p_order_id;
  insert into public.order_status_history(order_id, status, note)
  values (p_order_id, 'pago', 'Pagamento aprovado e estoque baixado automaticamente.');

  return query select true, 'pago'::public.order_status, null::text;
end;
$$;

revoke all on function public.settle_paid_order_inventory(uuid) from public;
revoke all on function public.settle_paid_order_inventory(uuid) from anon;
revoke all on function public.settle_paid_order_inventory(uuid) from authenticated;
grant execute on function public.settle_paid_order_inventory(uuid) to service_role;

commit;
