begin;

create or replace function public.create_manual_order_with_payment_state(
  p_fulfillment public.fulfillment_method,
  p_payment_method public.payment_method,
  p_payment_status public.payment_status,
  p_customer_name text,
  p_items jsonb,
  p_notes text default null
)
returns table(order_id uuid, order_number bigint, total_cents integer, pickup_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_order public.orders%rowtype;
  v_input record;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_item_id uuid;
  v_unit_price integer;
  v_reserved integer;
  v_total integer := 0;
  v_pickup_location text;
  v_pickup_instructions text;
begin
  if p_payment_status = 'aprovado' then
    return query select * from public.create_manual_order(p_fulfillment, p_payment_method, p_customer_name, p_items, p_notes);
    return;
  end if;

  if auth.uid() is null then raise exception 'Sessão obrigatória para registrar pedido manual.'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role not in ('admin', 'caixa', 'cozinha') then raise exception 'Apenas a equipe autorizada pode registrar pedidos manuais.'; end if;
  if p_payment_status <> 'pendente' then raise exception 'Estado de pagamento manual inválido.'; end if;
  if p_payment_method not in ('pix_presencial', 'dinheiro') then raise exception 'Forma de pagamento presencial inválida.'; end if;
  if p_fulfillment not in ('retirada', 'consumo_local') then raise exception 'Modalidade de atendimento inválida para pedido manual.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'Itens do pedido inválidos.'; end if;

  select location_name, instructions into v_pickup_location, v_pickup_instructions from public.store_pickup_settings where id = true;
  insert into public.orders (status, fulfillment, customer_name, notes, pickup_code, pickup_location, pickup_instructions, payment_expires_at)
  values ('aguardando_pagamento', p_fulfillment, nullif(btrim(p_customer_name), ''), nullif(btrim(p_notes), ''), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), v_pickup_location, v_pickup_instructions, now() + make_interval(days => 180))
  returning * into v_order;

  for v_input in select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, quantity integer)
  loop
    if v_input.product_id is null or v_input.quantity is null or v_input.quantity < 1 or v_input.quantity > 20 then raise exception 'Cada item precisa ter produto e quantidade entre 1 e 20.'; end if;
    select * into v_product from public.products where id = v_input.product_id for update;
    if not found or not v_product.is_active then raise exception 'Um produto do pedido não está disponível.'; end if;
    if v_input.variant_id is not null then
      select * into v_variant from public.product_variants where id = v_input.variant_id and product_id = v_product.id for update;
      if not found or not v_variant.is_active then raise exception 'Uma variação do pedido não está disponível.'; end if;
      select coalesce(sum(quantity), 0) into v_reserved from public.inventory_reservations where product_id = v_product.id and variant_id = v_variant.id and status = 'reservado' and expires_at > now();
      if v_variant.stock_quantity - v_reserved < v_input.quantity then raise exception 'Estoque indisponível para a variação selecionada.'; end if;
      v_unit_price := coalesce(v_variant.price_cents, v_product.price_cents);
    else
      if v_product.has_variants then raise exception 'Selecione uma variação para este produto.'; end if;
      select coalesce(sum(quantity), 0) into v_reserved from public.inventory_reservations where product_id = v_product.id and variant_id is null and status = 'reservado' and expires_at > now();
      if v_product.stock_quantity - v_reserved < v_input.quantity then raise exception 'Estoque indisponível para o produto selecionado.'; end if;
      v_variant := null; v_unit_price := v_product.price_cents;
    end if;
    insert into public.order_items (order_id, product_id, product_name, variant_id, variant_name, variant_sku, unit_price_cents, quantity, line_total_cents)
    values (v_order.id, v_product.id, v_product.name, v_variant.id, v_variant.name, v_variant.sku, v_unit_price, v_input.quantity, v_unit_price * v_input.quantity)
    returning id into v_item_id;
    insert into public.inventory_reservations (order_id, order_item_id, product_id, variant_id, quantity, expires_at)
    values (v_order.id, v_item_id, v_product.id, v_variant.id, v_input.quantity, v_order.payment_expires_at);
    v_total := v_total + (v_unit_price * v_input.quantity);
  end loop;

  update public.orders set subtotal_cents = v_total, total_cents = v_total, updated_at = now() where id = v_order.id;
  insert into public.payments (order_id, method, status, amount_cents, provider_payload)
  values (v_order.id, p_payment_method, 'pendente', v_total, jsonb_build_object('source', 'backoffice_manual', 'payment_expected_on_delivery', true, 'recorded_by', auth.uid(), 'recorded_at', now()));
  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, 'aguardando_pagamento', auth.uid(), 'Encomenda manual criada com pagamento pendente e estoque reservado por até 180 dias.');
  return query select v_order.id, v_order.order_number, v_total, v_order.pickup_code;
end;
$$;

create or replace function public.confirm_manual_order_payment(
  p_order_id uuid,
  p_payment_method public.payment_method
)
returns table(transitioned boolean, final_status public.order_status, failure_reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória para confirmar pagamento.'; end if;
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role not in ('admin', 'caixa', 'cozinha') then raise exception 'Apenas a equipe autorizada pode confirmar pagamento.'; end if;
  if p_payment_method not in ('pix_presencial', 'dinheiro') then raise exception 'Forma de pagamento presencial inválida.'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido não localizado.'; end if;
  if v_order.status <> 'aguardando_pagamento' then return query select false, v_order.status, 'order_not_pending'::text; return; end if;
  update public.payments set method = p_payment_method, status = 'aprovado', approved_at = now(), provider_payload = coalesce(provider_payload, '{}'::jsonb) || jsonb_build_object('confirmed_by', auth.uid(), 'confirmed_at', now()) where order_id = p_order_id and status = 'pendente';
  if not found then
    insert into public.payments (order_id, method, status, amount_cents, provider_payload, approved_at)
    values (p_order_id, p_payment_method, 'aprovado', v_order.total_cents, jsonb_build_object('source', 'backoffice_manual', 'confirmed_by', auth.uid(), 'confirmed_at', now()), now());
  end if;
  return query select * from public.settle_paid_order_inventory(p_order_id);
end;
$$;

revoke all on function public.create_manual_order_with_payment_state(public.fulfillment_method, public.payment_method, public.payment_status, text, jsonb, text) from public, anon;
grant execute on function public.create_manual_order_with_payment_state(public.fulfillment_method, public.payment_method, public.payment_status, text, jsonb, text) to authenticated;
revoke all on function public.confirm_manual_order_payment(uuid, public.payment_method) from public, anon;
grant execute on function public.confirm_manual_order_payment(uuid, public.payment_method) to authenticated;

commit;
