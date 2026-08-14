-- Eventos de origem externa podem aparecer na agenda FSA, mas não participam do ciclo interno de venda, estoque ou check-in.
alter table public.events
  add column if not exists external_provider text check (external_provider in ('sympla')),
  add column if not exists external_event_id text,
  add column if not exists external_url text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_external_provider_event_id_key'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_external_provider_event_id_key
      unique (external_provider, external_event_id);
  end if;
end $$;

create index if not exists events_external_provider_starts_idx
  on public.events(external_provider, starts_at asc)
  where external_provider is not null;

comment on column public.events.external_provider is 'Provedor que permanece como sistema mestre do evento espelhado.';
comment on column public.events.external_url is 'Página externa de inscrição; não inicia checkout interno.';
