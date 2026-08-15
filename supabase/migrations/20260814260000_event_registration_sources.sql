-- Distingue inscrições internas, operacionais e espelhadas, sem modificar o QR ou o fluxo de check-in.
alter table public.event_registrations
  add column if not exists source text not null default 'plataforma',
  add column if not exists external_registration_id text;

alter table public.event_registrations
  drop constraint if exists event_registrations_source_check;
alter table public.event_registrations
  add constraint event_registrations_source_check
  check (source in ('plataforma', 'sympla', 'manual'));

create unique index if not exists event_registrations_external_source_unique
  on public.event_registrations(source, external_registration_id)
  where external_registration_id is not null;

create index if not exists event_registrations_event_source_status_idx
  on public.event_registrations(event_id, source, status);

comment on column public.event_registrations.source is 'Origem da inscrição: plataforma, sympla ou lançamento manual.';
comment on column public.event_registrations.external_registration_id is 'Identificador da inscrição na origem externa, quando aplicável.';
