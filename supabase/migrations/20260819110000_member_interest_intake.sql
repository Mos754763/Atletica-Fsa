-- Cadastro de interesse público para novos membros da ATLETICA FSA.
-- A inserção pública é feita exclusivamente por Server Action com chave de serviço.

create table if not exists public.member_interest_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  email text not null unique check (email = lower(email)),
  whatsapp text,
  course text,
  semester text,
  interests text[] not null default '{}'::text[],
  message text,
  status text not null default 'novo' check (status in ('novo', 'em_contato', 'convidado', 'arquivado')),
  consent_at timestamptz not null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_interest_applications_status_created_idx
  on public.member_interest_applications(status, created_at desc);

drop trigger if exists member_interest_applications_set_updated_at on public.member_interest_applications;
create trigger member_interest_applications_set_updated_at
  before update on public.member_interest_applications
  for each row execute procedure public.set_updated_at();

alter table public.member_interest_applications enable row level security;

drop policy if exists "president can read member interest applications" on public.member_interest_applications;
create policy "president can read member interest applications"
  on public.member_interest_applications
  for select to authenticated
  using (public.is_president());

drop policy if exists "president can update member interest applications" on public.member_interest_applications;
create policy "president can update member interest applications"
  on public.member_interest_applications
  for update to authenticated
  using (public.is_president())
  with check (public.is_president());

grant select, update on public.member_interest_applications to authenticated;
