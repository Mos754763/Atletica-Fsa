-- Homologação de leitura Sympla: dados externos ficam separados do ciclo nativo de evento, pagamento e estoque.
create table if not exists public.event_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('sympla')),
  sync_mode text not null default 'read_only' check (sync_mode in ('read_only')),
  is_enabled boolean not null default true,
  sync_cursor text,
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('succeeded', 'failed', 'partial')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(provider)
);

create table if not exists public.event_external_links (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  internal_event_id uuid not null references public.events(id) on delete cascade,
  external_event_id text not null check (char_length(trim(external_event_id)) between 2 and 160),
  sync_direction text not null default 'inbound_read_only' check (sync_direction in ('inbound_read_only')),
  status text not null default 'pending_mapping' check (status in ('pending_mapping', 'active', 'paused', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id, external_event_id),
  unique(integration_id, internal_event_id)
);

create table if not exists public.external_event_records (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  event_link_id uuid references public.event_external_links(id) on delete set null,
  record_type text not null check (record_type in ('event', 'order', 'participant')),
  external_id text not null check (char_length(trim(external_id)) between 1 and 200),
  upstream_updated_at timestamptz,
  content_hash text not null check (char_length(content_hash) = 64),
  normalized_data jsonb not null default '{}'::jsonb,
  raw_payload jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(integration_id, record_type, external_id)
);

create table if not exists public.event_sync_runs (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  initiated_by uuid references public.profiles(id) on delete set null,
  trigger_source text not null check (trigger_source in ('manual', 'cron', 'replay')),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'partial')),
  records_read integer not null default 0 check (records_read >= 0),
  records_upserted integer not null default 0 check (records_upserted >= 0),
  cursor_before text,
  cursor_after text,
  error_code text,
  error_detail text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.event_sync_dead_letters (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references public.event_integrations(id) on delete cascade,
  sync_run_id uuid references public.event_sync_runs(id) on delete set null,
  phase text not null check (phase in ('fetch_events', 'normalize_events', 'persist_events')),
  error_code text,
  error_detail text not null,
  payload_excerpt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create index if not exists external_event_records_integration_type_idx on public.external_event_records(integration_id, record_type, observed_at desc);
create index if not exists event_sync_runs_integration_started_idx on public.event_sync_runs(integration_id, started_at desc);
create index if not exists event_sync_dead_letters_open_idx on public.event_sync_dead_letters(integration_id, created_at desc) where resolved_at is null;

drop trigger if exists event_integrations_set_updated_at on public.event_integrations;
create trigger event_integrations_set_updated_at before update on public.event_integrations for each row execute procedure public.set_updated_at();
drop trigger if exists event_external_links_set_updated_at on public.event_external_links;
create trigger event_external_links_set_updated_at before update on public.event_external_links for each row execute procedure public.set_updated_at();
drop trigger if exists external_event_records_set_updated_at on public.external_event_records;
create trigger external_event_records_set_updated_at before update on public.external_event_records for each row execute procedure public.set_updated_at();

alter table public.event_integrations enable row level security;
alter table public.event_external_links enable row level security;
alter table public.external_event_records enable row level security;
alter table public.event_sync_runs enable row level security;
alter table public.event_sync_dead_letters enable row level security;

grant select, insert, update on public.event_integrations to authenticated;
grant select, insert, update on public.event_external_links to authenticated;
grant select on public.external_event_records, public.event_sync_runs, public.event_sync_dead_letters to authenticated;

create policy "event integrations: administrators manage" on public.event_integrations for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "external event links: administrators manage" on public.event_external_links for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "external event records: administrators read" on public.external_event_records for select to authenticated using (public.is_admin());
create policy "event sync runs: administrators read" on public.event_sync_runs for select to authenticated using (public.is_admin());
create policy "event sync dead letters: administrators read" on public.event_sync_dead_letters for select to authenticated using (public.is_admin());
