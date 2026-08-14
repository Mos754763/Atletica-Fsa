begin;

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  sku text,
  attributes jsonb not null default '{}'::jsonb,
  price_cents integer check (price_cents is null or price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);
create unique index if not exists product_variants_sku_unique_idx on public.product_variants(sku) where sku is not null;
create index if not exists product_variants_product_active_idx on public.product_variants(product_id, is_active, sort_order);

create table if not exists public.sales_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  name text not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'aberto', 'encerrado', 'cumprido', 'cancelado')),
  price_cents integer check (price_cents is null or price_cents >= 0),
  minimum_quantity integer check (minimum_quantity is null or minimum_quantity > 0),
  target_quantity integer check (target_quantity is null or target_quantity > 0),
  opens_at timestamptz,
  closes_at timestamptz,
  pickup_starts_at timestamptz,
  pickup_ends_at timestamptz,
  instructions text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);
create index if not exists sales_batches_product_status_idx on public.sales_batches(product_id, status, opens_at, closes_at);

create table if not exists public.store_pickup_settings (
  id boolean primary key default true check (id),
  location_name text,
  instructions text,
  reservation_minutes integer not null default 15 check (reservation_minutes between 5 and 60),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.store_pickup_settings (id) values (true) on conflict (id) do nothing;

alter table public.products add column if not exists has_variants boolean not null default false;
alter table public.products add column if not exists preorder_enabled boolean not null default false;
alter table public.orders add column if not exists fulfillment_status text not null default 'aguardando_pagamento' check (fulfillment_status in ('aguardando_pagamento', 'aguardando_preparo', 'em_preparo', 'pronto_para_retirada', 'retirado', 'cancelado'));
alter table public.orders add column if not exists payment_expires_at timestamptz;
alter table public.orders add column if not exists pickup_code text unique;
alter table public.orders add column if not exists pickup_qr_token uuid unique default gen_random_uuid();
alter table public.orders add column if not exists pickup_location text;
alter table public.orders add column if not exists pickup_instructions text;
alter table public.orders add column if not exists pickup_deadline_at timestamptz;
alter table public.orders add column if not exists picked_up_at timestamptz;
alter table public.orders add column if not exists picked_up_by uuid references public.profiles(id) on delete set null;
alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_name text;
alter table public.order_items add column if not exists variant_sku text;
alter table public.order_items add column if not exists sales_batch_id uuid references public.sales_batches(id) on delete set null;

update public.orders
   set pickup_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
 where pickup_code is null;
alter table public.orders alter column pickup_code set default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

create table if not exists public.inventory_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  status text not null default 'reservado' check (status in ('reservado', 'confirmado', 'liberado', 'expirado')),
  expires_at timestamptz not null,
  committed_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_item_id)
);
create index if not exists inventory_reservations_available_idx on public.inventory_reservations(product_id, variant_id, expires_at) where status = 'reservado';
create index if not exists inventory_reservations_order_idx on public.inventory_reservations(order_id);
create index if not exists orders_pickup_code_idx on public.orders(pickup_code) where status in ('pago', 'em_preparo', 'pronto');

create or replace function public.sync_order_fulfillment_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.fulfillment_status := case new.status
    when 'aguardando_pagamento' then 'aguardando_pagamento'
    when 'pago' then 'aguardando_preparo'
    when 'em_preparo' then 'em_preparo'
    when 'pronto' then 'pronto_para_retirada'
    when 'entregue' then 'retirado'
    when 'cancelado' then 'cancelado'
    else new.fulfillment_status
  end;
  return new;
end;
$$;
drop trigger if exists orders_sync_fulfillment_status on public.orders;
create trigger orders_sync_fulfillment_status before insert or update of status on public.orders for each row execute procedure public.sync_order_fulfillment_status();

create or replace function public.expire_inventory_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.inventory_reservations
       set status = 'expirado', released_at = now()
     where status = 'reservado' and expires_at <= now()
     returning order_id
  ), cancelled_orders as (
    update public.orders o
       set status = 'cancelado', updated_at = now()
     where o.id in (select distinct order_id from expired)
       and o.status = 'aguardando_pagamento'
     returning o.id
  )
  insert into public.order_status_history(order_id, status, note)
  select id, 'cancelado', 'Reserva de estoque expirada antes da confirmação do pagamento.' from cancelled_orders;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.create_checkout_order(p_fulfillment public.fulfillment_method, p_items jsonb)
returns table(order_id uuid, order_number bigint, total_cents integer, pickup_code text, payment_expires_at timestamptz)
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
  v_batch public.sales_batches%rowtype;
  v_item_id uuid;
  v_unit_price integer;
  v_total integer := 0;
  v_reserved integer;
  v_reservation_minutes integer;
  v_pickup_location text;
  v_pickup_instructions text;
begin
  if auth.uid() is null then raise exception 'Sessão obrigatória para iniciar o checkout.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then
    raise exception 'Carrinho inválido.';
  end if;

  select * into v_profile from public.profiles where id = auth.uid();
  if not found then raise exception 'Perfil não localizado.'; end if;
  select reservation_minutes, location_name, instructions
    into v_reservation_minutes, v_pickup_location, v_pickup_instructions
    from public.store_pickup_settings where id = true;
  v_reservation_minutes := coalesce(v_reservation_minutes, 15);

  insert into public.orders (customer_id, status, fulfillment, customer_name, customer_email, payment_expires_at, pickup_code, pickup_location, pickup_instructions)
  values (v_profile.id, 'aguardando_pagamento', p_fulfillment, v_profile.display_name, v_profile.email, now() + make_interval(mins => v_reservation_minutes), upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)), v_pickup_location, v_pickup_instructions)
  returning * into v_order;

  for v_input in select * from jsonb_to_recordset(p_items) as x(product_id uuid, variant_id uuid, sales_batch_id uuid, quantity integer)
  loop
    if v_input.quantity is null or v_input.quantity < 1 or v_input.quantity > 20 then raise exception 'Quantidade inválida.'; end if;
    select * into v_product from public.products where id = v_input.product_id for update;
    if not found or not v_product.is_active then raise exception 'Um produto do carrinho não está disponível.'; end if;

    if v_input.variant_id is not null then
      select * into v_variant from public.product_variants where id = v_input.variant_id and product_id = v_product.id for update;
      if not found or not v_variant.is_active then raise exception 'Uma variação do carrinho não está disponível.'; end if;
      select coalesce(sum(quantity), 0) into v_reserved from public.inventory_reservations
       where product_id = v_product.id and variant_id = v_variant.id and status = 'reservado' and expires_at > now();
      if v_variant.stock_quantity - v_reserved < v_input.quantity then raise exception 'Estoque indisponível para a variação selecionada.'; end if;
      v_unit_price := coalesce(v_variant.price_cents, v_product.price_cents);
    else
      if v_product.has_variants then raise exception 'Selecione uma variação para este produto.'; end if;
      select coalesce(sum(quantity), 0) into v_reserved from public.inventory_reservations
       where product_id = v_product.id and variant_id is null and status = 'reservado' and expires_at > now();
      if v_product.stock_quantity - v_reserved < v_input.quantity then raise exception 'Estoque indisponível para um produto do carrinho.'; end if;
      v_unit_price := v_product.price_cents;
      v_variant := null;
    end if;

    if v_input.sales_batch_id is not null then
      select * into v_batch from public.sales_batches where id = v_input.sales_batch_id and product_id = v_product.id for update;
      if not found or v_batch.status <> 'aberto' or (v_batch.opens_at is not null and v_batch.opens_at > now()) or (v_batch.closes_at is not null and v_batch.closes_at <= now()) then
        raise exception 'O lote de pré-venda selecionado não está disponível.';
      end if;
      if v_batch.variant_id is not null and v_batch.variant_id is distinct from v_input.variant_id then raise exception 'O lote não corresponde à variação selecionada.'; end if;
      v_unit_price := coalesce(v_batch.price_cents, v_unit_price);
    else
      v_batch := null;
    end if;

    insert into public.order_items (order_id, product_id, product_name, variant_id, variant_name, variant_sku, sales_batch_id, unit_price_cents, quantity, line_total_cents)
    values (v_order.id, v_product.id, v_product.name, v_variant.id, v_variant.name, v_variant.sku, v_batch.id, v_unit_price, v_input.quantity, v_unit_price * v_input.quantity)
    returning id into v_item_id;
    insert into public.inventory_reservations (order_id, order_item_id, product_id, variant_id, quantity, expires_at)
    values (v_order.id, v_item_id, v_product.id, v_variant.id, v_input.quantity, v_order.payment_expires_at);
    v_total := v_total + (v_unit_price * v_input.quantity);
  end loop;

  update public.orders set subtotal_cents = v_total, total_cents = v_total, updated_at = now() where id = v_order.id;
  insert into public.order_status_history(order_id, status, changed_by, note)
  values (v_order.id, 'aguardando_pagamento', v_profile.id, 'Pedido criado com reserva temporária de estoque.');
  return query select v_order.id, v_order.order_number, v_total, v_order.pickup_code, v_order.payment_expires_at;
end;
$$;

create or replace function public.cancel_checkout_order(p_order_id uuid, p_note text default 'Falha ao iniciar o Checkout Mercado Pago.')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or (v_order.customer_id <> auth.uid() and not public.is_staff()) then return false; end if;
  if v_order.status <> 'aguardando_pagamento' then return false; end if;
  update public.inventory_reservations set status = 'liberado', released_at = now() where order_id = p_order_id and status = 'reservado';
  update public.orders set status = 'cancelado', updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, status, changed_by, note) values (p_order_id, 'cancelado', auth.uid(), p_note);
  return true;
end;
$$;

create or replace function public.settle_paid_order_inventory(p_order_id uuid)
returns table(transitioned boolean, final_status public.order_status, failure_reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.orders%rowtype;
  order_line record;
  locked_product public.products%rowtype;
  locked_variant public.product_variants%rowtype;
begin
  select * into current_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'Pedido % não localizado para liquidação de estoque.', p_order_id; end if;
  if current_order.inventory_committed_at is not null then return query select false, current_order.status, null::text; return; end if;
  if current_order.status <> 'aguardando_pagamento' then return query select false, current_order.status, 'order_not_pending'::text; return; end if;

  for order_line in select oi.product_id, oi.variant_id, oi.quantity, oi.product_name, ir.id as reservation_id, ir.status as reservation_status from public.order_items oi left join public.inventory_reservations ir on ir.order_item_id = oi.id where oi.order_id = p_order_id order by oi.product_id, oi.variant_id nulls first
  loop
    if order_line.product_id is null then
      update public.orders set status = 'cancelado', notes = concat_ws(E'\n', notes, 'Pagamento aprovado sem referência de produto; estorno manual necessário.'), updated_at = now() where id = p_order_id;
      insert into public.order_status_history(order_id, status, note) values (p_order_id, 'cancelado', 'Pagamento aprovado sem produto associado; pedido bloqueado para estorno manual.');
      return query select true, 'cancelado'::public.order_status, 'missing_product_reference'::text; return;
    end if;
    select * into locked_product from public.products where id = order_line.product_id for update;
    if not found or not locked_product.is_active then
      update public.orders set status = 'cancelado', notes = concat_ws(E'\n', notes, 'Pagamento aprovado para produto indisponível; estorno manual necessário.'), updated_at = now() where id = p_order_id;
      update public.inventory_reservations set status = 'liberado', released_at = now() where order_id = p_order_id and status = 'reservado';
      insert into public.order_status_history(order_id, status, note) values (p_order_id, 'cancelado', 'Produto indisponível no momento da liquidação; pedido bloqueado para estorno manual.');
      return query select true, 'cancelado'::public.order_status, 'product_unavailable'::text; return;
    end if;
    if order_line.variant_id is not null then
      select * into locked_variant from public.product_variants where id = order_line.variant_id and product_id = locked_product.id for update;
      if not found or not locked_variant.is_active or locked_variant.stock_quantity < order_line.quantity then
        update public.orders set status = 'cancelado', notes = concat_ws(E'\n', notes, 'Pagamento aprovado sem estoque da variação; estorno manual necessário.'), updated_at = now() where id = p_order_id;
        update public.inventory_reservations set status = 'liberado', released_at = now() where order_id = p_order_id and status = 'reservado';
        insert into public.order_status_history(order_id, status, note) values (p_order_id, 'cancelado', 'Variação indisponível no momento da liquidação; pedido bloqueado para estorno manual.');
        return query select true, 'cancelado'::public.order_status, 'variant_stock_unavailable'::text; return;
      end if;
    elsif locked_product.stock_quantity < order_line.quantity then
      update public.orders set status = 'cancelado', notes = concat_ws(E'\n', notes, 'Pagamento aprovado sem estoque disponível; estorno manual necessário.'), updated_at = now() where id = p_order_id;
      update public.inventory_reservations set status = 'liberado', released_at = now() where order_id = p_order_id and status = 'reservado';
      insert into public.order_status_history(order_id, status, note) values (p_order_id, 'cancelado', 'Produto indisponível no momento da liquidação; pedido bloqueado para estorno manual.');
      return query select true, 'cancelado'::public.order_status, 'stock_unavailable'::text; return;
    end if;
  end loop;

  for order_line in select oi.product_id, oi.variant_id, oi.quantity, oi.variant_name from public.order_items oi where oi.order_id = p_order_id order by oi.product_id, oi.variant_id nulls first
  loop
    if order_line.variant_id is not null then
      update public.product_variants set stock_quantity = stock_quantity - order_line.quantity, updated_at = now() where id = order_line.variant_id;
      insert into public.inventory_movements(product_id, quantity_delta, reason, reference_type, reference_id) values (order_line.product_id, -order_line.quantity, concat('Baixa automática por pagamento aprovado — ', coalesce(order_line.variant_name, 'variação')), 'order', p_order_id);
    else
      update public.products set stock_quantity = stock_quantity - order_line.quantity, updated_at = now() where id = order_line.product_id;
      insert into public.inventory_movements(product_id, quantity_delta, reason, reference_type, reference_id) values (order_line.product_id, -order_line.quantity, 'Baixa automática por pagamento aprovado', 'order', p_order_id);
    end if;
  end loop;

  update public.inventory_reservations set status = 'confirmado', committed_at = now() where order_id = p_order_id and status = 'reservado';
  update public.orders set status = 'pago', paid_at = now(), inventory_committed_at = now(), updated_at = now() where id = p_order_id;
  insert into public.order_status_history(order_id, status, note) values (p_order_id, 'pago', 'Pagamento aprovado, estoque confirmado e retirada liberada para preparo.');
  return query select true, 'pago'::public.order_status, null::text;
end;
$$;

drop trigger if exists product_variants_set_updated_at on public.product_variants;
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute procedure public.set_updated_at();
drop trigger if exists sales_batches_set_updated_at on public.sales_batches;
create trigger sales_batches_set_updated_at before update on public.sales_batches for each row execute procedure public.set_updated_at();
drop trigger if exists store_pickup_settings_set_updated_at on public.store_pickup_settings;
create trigger store_pickup_settings_set_updated_at before update on public.store_pickup_settings for each row execute procedure public.set_updated_at();

alter table public.product_variants enable row level security;
alter table public.sales_batches enable row level security;
alter table public.store_pickup_settings enable row level security;
alter table public.inventory_reservations enable row level security;
grant select on public.product_variants, public.sales_batches to anon, authenticated;
create policy "variants: public reads active" on public.product_variants for select to anon, authenticated using (is_active or public.can_manage_catalog());
create policy "variants: catalog manager manages" on public.product_variants for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "sales batches: public reads open" on public.sales_batches for select to anon, authenticated using (status = 'aberto' or public.can_manage_catalog());
create policy "sales batches: catalog manager manages" on public.sales_batches for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "pickup settings: staff reads" on public.store_pickup_settings for select to authenticated using (public.is_staff());
create policy "pickup settings: catalog manager manages" on public.store_pickup_settings for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "reservations: customer reads own" on public.inventory_reservations for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid()));
create policy "reservations: staff reads" on public.inventory_reservations for select to authenticated using (public.is_staff());

revoke all on function public.create_checkout_order(public.fulfillment_method, jsonb) from public, anon;
grant execute on function public.create_checkout_order(public.fulfillment_method, jsonb) to authenticated;
revoke all on function public.cancel_checkout_order(uuid, text) from public, anon;
grant execute on function public.cancel_checkout_order(uuid, text) to authenticated;
revoke all on function public.expire_inventory_reservations() from public, anon, authenticated;
grant execute on function public.expire_inventory_reservations() to service_role;
revoke all on function public.settle_paid_order_inventory(uuid) from public, anon, authenticated;
grant execute on function public.settle_paid_order_inventory(uuid) to service_role;

commit;
