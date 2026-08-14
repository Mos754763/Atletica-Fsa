begin;

create or replace function public.create_manual_order(
  p_fulfillment public.fulfillment_method,
  p_payment_method public.payment_method,
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
  v_total integer := 0;
  v_pickup_location text;
  v_pickup_instructions text;
begin
  if auth.uid() is null then
    raise exception 'Sessão obrigatória para registrar pedido manual.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found or v_profile.role not in ('admin', 'caixa', 'cozinha') then
    raise exception 'Apenas a equipe autorizada pode registrar pedidos manuais.';
  end if;

  if p_payment_method not in ('pix_presencial', 'dinheiro') then
    raise exception 'Forma de pagamento presencial inválida.';
  end if;

  if p_fulfillment not in ('retirada', 'consumo_local') then
    raise exception 'Modalidade de atendimento inválida para pedido manual.';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Itens do pedido inválidos.';
  end if;

  select location_name, instructions
    into v_pickup_location, v_pickup_instructions
    from public.store_pickup_settings
   where id = true;

  insert into public.orders (
    status, fulfillment, customer_name, notes, pickup_code, pickup_location,
    pickup_instructions, paid_at, inventory_committed_at
  ) values (
    'pago', p_fulfillment, nullif(btrim(p_customer_name), ''), nullif(btrim(p_notes), ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    v_pickup_location, v_pickup_instructions, now(), now()
  ) returning * into v_order;

  for v_input in
    select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, quantity integer)
  loop
    if v_input.product_id is null or v_input.quantity is null or v_input.quantity < 1 or v_input.quantity > 20 then
      raise exception 'Cada item precisa ter produto e quantidade entre 1 e 20.';
    end if;

    select * into v_product from public.products where id = v_input.product_id for update;
    if not found or not v_product.is_active then
      raise exception 'Um produto do pedido não está disponível.';
    end if;

    if v_input.variant_id is not null then
      select * into v_variant
        from public.product_variants
       where id = v_input.variant_id and product_id = v_product.id
       for update;
      if not found or not v_variant.is_active then
        raise exception 'Uma variação do pedido não está disponível.';
      end if;
      if v_variant.stock_quantity < v_input.quantity then
        raise exception 'Estoque indisponível para a variação selecionada.';
      end if;
      v_unit_price := coalesce(v_variant.price_cents, v_product.price_cents);
    else
      if v_product.has_variants then
        raise exception 'Selecione uma variação para este produto.';
      end if;
      if v_product.stock_quantity < v_input.quantity then
        raise exception 'Estoque indisponível para o produto selecionado.';
      end if;
      v_variant := null;
      v_unit_price := v_product.price_cents;
    end if;

    insert into public.order_items (
      order_id, product_id, product_name, variant_id, variant_name, variant_sku,
      unit_price_cents, quantity, line_total_cents
    ) values (
      v_order.id, v_product.id, v_product.name, v_variant.id, v_variant.name, v_variant.sku,
      v_unit_price, v_input.quantity, v_unit_price * v_input.quantity
    ) returning id into v_item_id;

    if v_variant.id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity - v_input.quantity, updated_at = now()
       where id = v_variant.id;
      insert into public.inventory_movements (product_id, quantity_delta, reason, reference_type, reference_id, created_by)
      values (v_product.id, -v_input.quantity, concat('Baixa por pedido manual presencial — ', v_variant.name), 'order', v_order.id, auth.uid());
    else
      update public.products
         set stock_quantity = stock_quantity - v_input.quantity, updated_at = now()
       where id = v_product.id;
      insert into public.inventory_movements (product_id, quantity_delta, reason, reference_type, reference_id, created_by)
      values (v_product.id, -v_input.quantity, 'Baixa por pedido manual presencial', 'order', v_order.id, auth.uid());
    end if;

    v_total := v_total + (v_unit_price * v_input.quantity);
  end loop;

  update public.orders
     set subtotal_cents = v_total, total_cents = v_total, updated_at = now()
   where id = v_order.id;

  insert into public.payments (order_id, method, status, amount_cents, provider_payload, approved_at)
  values (
    v_order.id, p_payment_method, 'aprovado', v_total,
    jsonb_build_object('source', 'backoffice_manual', 'recorded_by', auth.uid(), 'recorded_at', now()), now()
  );

  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, 'pago', auth.uid(), 'Pedido manual registrado com pagamento presencial confirmado e estoque baixado.');

  return query select v_order.id, v_order.order_number, v_total, v_order.pickup_code;
end;
$$;

revoke all on function public.create_manual_order(public.fulfillment_method, public.payment_method, text, jsonb, text) from public, anon;
grant execute on function public.create_manual_order(public.fulfillment_method, public.payment_method, text, jsonb, text) to authenticated;

commit;
