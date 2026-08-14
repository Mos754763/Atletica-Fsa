begin;

create or replace function public.update_catalog_product(
  p_product_id uuid,
  p_name text,
  p_sku text,
  p_description text,
  p_category_id uuid,
  p_price_cents integer,
  p_stock_quantity integer,
  p_is_active boolean,
  p_is_featured boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.products%rowtype;
  v_delta integer;
begin
  if not public.can_manage_catalog() then
    raise exception 'Sem permissão para editar o catálogo.' using errcode = '42501';
  end if;

  if p_name is null or length(btrim(p_name)) < 3 then
    raise exception 'Nome do produto inválido.' using errcode = '22023';
  end if;
  if p_price_cents is null or p_price_cents < 0 or p_stock_quantity is null or p_stock_quantity < 0 then
    raise exception 'Preço ou estoque inválido.' using errcode = '22023';
  end if;

  select * into v_product from public.products where id = p_product_id for update;
  if not found then
    raise exception 'Produto não encontrado.' using errcode = 'P0002';
  end if;

  update public.products
     set name = btrim(p_name),
         sku = nullif(btrim(coalesce(p_sku, '')), ''),
         description = nullif(btrim(coalesce(p_description, '')), ''),
         category_id = p_category_id,
         price_cents = p_price_cents,
         stock_quantity = p_stock_quantity,
         is_active = coalesce(p_is_active, false),
         is_featured = coalesce(p_is_featured, false),
         updated_at = now()
   where id = p_product_id;

  v_delta := p_stock_quantity - v_product.stock_quantity;
  if v_delta <> 0 then
    insert into public.inventory_movements(product_id, quantity_delta, reason, reference_type, reference_id, created_by)
    values (p_product_id, v_delta, 'Ajuste manual no catálogo', 'catalog_admin', p_product_id, auth.uid());
  end if;
end;
$$;

revoke all on function public.update_catalog_product(uuid, text, text, text, uuid, integer, integer, boolean, boolean) from public;
grant execute on function public.update_catalog_product(uuid, text, text, text, uuid, integer, integer, boolean, boolean) to authenticated;

commit;
