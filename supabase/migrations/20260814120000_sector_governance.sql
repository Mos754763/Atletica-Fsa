begin;

create type public.sector_membership_role as enum ('diretor', 'membro', 'visualizador');
create type public.permission_action as enum ('ver', 'criar', 'editar', 'apagar');

alter table public.profiles add column if not exists is_president boolean not null default false;

create table public.sectors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table public.sector_memberships (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid not null references public.sectors(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  role public.sector_membership_role not null default 'membro',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  ended_by uuid references public.profiles(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create unique index sector_memberships_one_active_membership_idx
  on public.sector_memberships(sector_id, profile_id)
  where ended_at is null;
create unique index sector_memberships_one_active_director_idx
  on public.sector_memberships(sector_id)
  where ended_at is null and role = 'diretor';
create index sector_memberships_profile_active_idx on public.sector_memberships(profile_id, started_at desc) where ended_at is null;

create table public.permission_grants (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  sector_id uuid references public.sectors(id) on delete cascade,
  resource_key text not null default '*',
  action public.permission_action not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  note text
);
create unique index permission_grants_active_unique_idx
  on public.permission_grants(profile_id, sector_id, resource_key, action)
  where revoked_at is null;

create or replace function public.is_president()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_president from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_sector_director(p_sector_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.sector_memberships
     where sector_id = p_sector_id and profile_id = auth.uid() and role = 'diretor' and ended_at is null
  );
$$;

create or replace function public.can_manage_sector(p_sector_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_president() or public.is_sector_director(p_sector_id);
$$;

alter table public.sectors enable row level security;
alter table public.sector_memberships enable row level security;
alter table public.permission_grants enable row level security;

grant select on public.sectors to anon, authenticated;
grant select on public.sector_memberships, public.permission_grants to authenticated;

create policy "sectors: public reads active" on public.sectors
  for select to anon, authenticated using (is_active and deleted_at is null or public.is_president());
create policy "sectors: president manages" on public.sectors
  for all to authenticated using (public.is_president()) with check (public.is_president());

create policy "memberships: member reads own" on public.sector_memberships
  for select to authenticated using (profile_id = auth.uid() or public.is_president() or public.is_sector_director(sector_id));
create policy "memberships: president manages" on public.sector_memberships
  for all to authenticated using (public.is_president()) with check (public.is_president());

create policy "grants: member reads own" on public.permission_grants
  for select to authenticated using (profile_id = auth.uid() or public.is_president());
create policy "grants: president manages" on public.permission_grants
  for all to authenticated using (public.is_president()) with check (public.is_president());

insert into public.sectors(name, slug, sort_order) values
  ('Suprimentos', 'suprimentos', 10),
  ('Eventos', 'eventos', 20),
  ('Sociais', 'sociais', 30),
  ('Marketing', 'marketing', 40),
  ('Esportes', 'esportes', 50)
on conflict (slug) do nothing;

commit;
