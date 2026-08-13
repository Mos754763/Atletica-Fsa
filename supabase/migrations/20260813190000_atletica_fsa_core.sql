-- ATLETICA FSA — core domain, roles and RLS
-- Apply with a privileged PostgreSQL connection or the Supabase SQL editor.

create extension if not exists pgcrypto;

do $$ begin
  create type public.user_role as enum ('admin', 'cozinha', 'caixa', 'cliente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.event_status as enum ('divulgando', 'inscricoes_abertas', 'em_andamento', 'encerrado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum ('criado', 'aguardando_pagamento', 'pago', 'em_preparo', 'pronto', 'entregue', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pendente', 'aprovado', 'recusado', 'cancelado', 'reembolsado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('mercado_pago_checkout', 'mercado_pago_pos', 'pix_presencial', 'dinheiro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fulfillment_method as enum ('retirada', 'consumo_local', 'entrega_evento');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.registration_status as enum ('pendente', 'confirmada', 'cancelada', 'check_in_realizado');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  role public.user_role not null default 'cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_unique_idx on public.profiles (lower(email)) where email is not null;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false)
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'cozinha', 'caixa'), false)
$$;

create or replace function public.can_manage_catalog()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin', 'caixa'), false)
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, 'Torcida FSA'), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role = old.role;
    new.email = old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists profiles_protect_fields on public.profiles;
create trigger profiles_protect_fields before update on public.profiles for each row execute procedure public.protect_profile_fields();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  sku text unique,
  price_cents integer not null check (price_cents >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_featured_idx on public.products(is_active, is_featured);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_provider text not null default 's3',
  storage_key text,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete restrict,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_created_idx on public.inventory_movements(product_id, created_at desc);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  cover_url text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.event_status not null default 'divulgando',
  registration_price_cents integer not null default 0 check (registration_price_cents >= 0),
  capacity integer check (capacity is null or capacity > 0),
  requires_registration boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists events_status_starts_idx on public.events(status, starts_at);

create table if not exists public.event_products (
  event_id uuid not null references public.events(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  price_override_cents integer check (price_override_cents >= 0),
  is_available boolean not null default true,
  primary key (event_id, product_id)
);

create table if not exists public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  attendee_name text not null,
  attendee_email text,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  status public.registration_status not null default 'pendente',
  check_in_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, customer_id)
);

create index if not exists event_registrations_event_status_idx on public.event_registrations(event_id, status);
create index if not exists event_registrations_customer_idx on public.event_registrations(customer_id, created_at desc);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid references public.profiles(id) on delete set null,
  event_id uuid references public.events(id) on delete set null,
  status public.order_status not null default 'criado',
  fulfillment public.fulfillment_method not null default 'retirada',
  customer_name text,
  customer_email text,
  notes text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  mercado_pago_preference_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  ready_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at asc);
create index if not exists orders_event_created_idx on public.orders(event_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity > 0),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  registration_id uuid references public.event_registrations(id) on delete set null,
  method public.payment_method not null,
  status public.payment_status not null default 'pendente',
  provider_reference text unique,
  amount_cents integer not null check (amount_cents >= 0),
  provider_payload jsonb,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((order_id is not null)::integer + (registration_id is not null)::integer = 1)
);

create index if not exists payments_order_idx on public.payments(order_id, created_at desc);
create index if not exists payments_registration_idx on public.payments(registration_id, created_at desc);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status public.order_status not null,
  changed_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at asc);

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  template_key text not null,
  related_order_id uuid references public.orders(id) on delete set null,
  related_registration_id uuid references public.event_registrations(id) on delete set null,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_deliveries_recipient_created_idx on public.email_deliveries(recipient_profile_id, created_at desc);

create table if not exists public.automation_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  run_at timestamptz not null,
  processed_at timestamptz,
  failed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists automation_jobs_pending_idx on public.automation_jobs(run_at) where processed_at is null and failed_at is null;

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at before update on public.events for each row execute procedure public.set_updated_at();
drop trigger if exists registrations_set_updated_at on public.event_registrations;
create trigger registrations_set_updated_at before update on public.event_registrations for each row execute procedure public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at before update on public.payments for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.events enable row level security;
alter table public.event_products enable row level security;
alter table public.event_registrations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.order_status_history enable row level security;
alter table public.email_deliveries enable row level security;
alter table public.automation_jobs enable row level security;

grant select on public.categories, public.products, public.product_images, public.events, public.event_products to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.event_registrations to authenticated;
grant select on public.orders, public.order_items, public.payments, public.order_status_history, public.email_deliveries to authenticated;

create policy "profiles: user sees own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: user edits own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "profiles: admin reads all profiles" on public.profiles for select to authenticated using (public.is_admin());
create policy "profiles: admin manages profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "categories: public reads active" on public.categories for select to anon, authenticated using (is_active or public.can_manage_catalog());
create policy "categories: catalog manager manages" on public.categories for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "products: public reads active" on public.products for select to anon, authenticated using (is_active or public.can_manage_catalog());
create policy "products: catalog manager manages" on public.products for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "product images: public reads active product" on public.product_images for select to anon, authenticated using (exists (select 1 from public.products p where p.id = product_id and (p.is_active or public.can_manage_catalog())));
create policy "product images: catalog manager manages" on public.product_images for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());
create policy "inventory: staff manages" on public.inventory_movements for all to authenticated using (public.can_manage_catalog()) with check (public.can_manage_catalog());

create policy "events: public reads" on public.events for select to anon, authenticated using (true);
create policy "events: staff manages" on public.events for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "event products: public reads" on public.event_products for select to anon, authenticated using (true);
create policy "event products: staff manages" on public.event_products for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "registrations: customer reads own" on public.event_registrations for select to authenticated using ((select auth.uid()) = customer_id);
create policy "registrations: customer creates own" on public.event_registrations for insert to authenticated with check ((select auth.uid()) = customer_id and status = 'pendente');
create policy "registrations: staff manages" on public.event_registrations for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "orders: customer reads own" on public.orders for select to authenticated using ((select auth.uid()) = customer_id);
create policy "orders: staff reads" on public.orders for select to authenticated using (public.is_staff());
create policy "orders: staff updates" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "order items: customer reads own" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy "order items: staff reads" on public.order_items for select to authenticated using (public.is_staff());
create policy "payments: customer reads own" on public.payments for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())) or exists (select 1 from public.event_registrations r where r.id = registration_id and r.customer_id = (select auth.uid())));
create policy "payments: staff reads" on public.payments for select to authenticated using (public.is_staff());
create policy "order history: customer reads own" on public.order_status_history for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.customer_id = (select auth.uid())));
create policy "order history: staff reads" on public.order_status_history for select to authenticated using (public.is_staff());
create policy "email deliveries: user reads own" on public.email_deliveries for select to authenticated using ((select auth.uid()) = recipient_profile_id);
create policy "email deliveries: admin reads all" on public.email_deliveries for select to authenticated using (public.is_admin());
create policy "automations: admin reads" on public.automation_jobs for select to authenticated using (public.is_admin());

insert into public.categories (name, slug, sort_order) values
  ('Vestuário', 'vestuario', 10),
  ('Acessórios', 'acessorios', 20),
  ('Colecionáveis', 'colecionaveis', 30),
  ('Bebidas', 'bebidas', 40)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, sku, price_cents, stock_quantity, is_featured)
select c.id, v.name, v.slug, v.sku, v.price_cents, v.stock_quantity, v.is_featured
from (values
  ('vestuario', 'Camiseta Oficial FSA', 'camiseta-oficial-fsa', 'FSA-CAM-001', 6990, 0, true),
  ('vestuario', 'Moletom Titular FSA', 'moletom-titular-fsa', 'FSA-MOL-001', 14990, 0, true),
  ('acessorios', 'Copo FSA', 'copo-fsa', 'FSA-COP-001', 2490, 0, true),
  ('colecionaveis', 'Chaveiro Coelho FSA', 'chaveiro-coelho-fsa', 'FSA-CHA-001', 1490, 0, true),
  ('colecionaveis', 'Figurinhas FSA', 'figurinhas-fsa', 'FSA-FIG-001', 800, 0, false),
  ('bebidas', 'Bebida em lata', 'bebida-em-lata', 'FSA-BEB-001', 700, 0, false)
) as v(category_slug, name, slug, sku, price_cents, stock_quantity, is_featured)
join public.categories c on c.slug = v.category_slug
on conflict (slug) do nothing;

do $$ begin
  alter publication supabase_realtime add table public.orders;
exception when duplicate_object then null; end $$;
