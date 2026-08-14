-- Fila de e-mails, templates e automações configuráveis.
-- A fila é processada pelo cron autenticado; nunca pelo request do cliente.

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  name text not null,
  description text,
  subject_template text not null,
  html_template text not null,
  is_system boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  recipient_email text not null,
  recipient_profile_id uuid references public.profiles(id) on delete set null,
  template_key text not null,
  subject text not null,
  html text not null,
  priority smallint not null default 50 check (priority between 0 and 100),
  status text not null default 'pending' check (status in ('pending', 'processing', 'sent', 'failed', 'canceled')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  last_error text,
  provider_message_id text,
  related_order_id uuid references public.orders(id) on delete set null,
  related_registration_id uuid references public.event_registrations(id) on delete set null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_outbox_pending_idx on public.email_outbox(priority desc, next_attempt_at asc, created_at asc)
  where status in ('pending', 'processing');
create index if not exists email_outbox_recipient_idx on public.email_outbox(recipient_profile_id, created_at desc);

create table if not exists public.automation_rules (
  id uuid primary key default gen_random_uuid(),
  sector_id uuid references public.sectors(id) on delete set null,
  name text not null,
  description text,
  trigger_key text not null,
  condition_json jsonb not null default '{}'::jsonb,
  action_json jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists automation_rules_trigger_idx on public.automation_rules(trigger_key) where enabled and deleted_at is null;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  dedupe_key text not null,
  status text not null default 'queued' check (status in ('queued', 'succeeded', 'failed', 'skipped')),
  context_json jsonb not null default '{}'::jsonb,
  outcome_json jsonb not null default '{}'::jsonb,
  error_message text,
  executed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(rule_id, dedupe_key)
);

create index if not exists automation_runs_rule_idx on public.automation_runs(rule_id, created_at desc);

drop trigger if exists email_templates_set_updated_at on public.email_templates;
create trigger email_templates_set_updated_at before update on public.email_templates for each row execute procedure public.set_updated_at();
drop trigger if exists email_outbox_set_updated_at on public.email_outbox;
create trigger email_outbox_set_updated_at before update on public.email_outbox for each row execute procedure public.set_updated_at();
drop trigger if exists automation_rules_set_updated_at on public.automation_rules;
create trigger automation_rules_set_updated_at before update on public.automation_rules for each row execute procedure public.set_updated_at();

create or replace function public.claim_email_outbox(p_limit integer default 25)
returns setof public.email_outbox
language sql
security definer
set search_path = public
as $$
  with candidates as (
    select id
    from public.email_outbox
    where (
      (status = 'pending' and next_attempt_at <= now())
      or (status = 'processing' and locked_at < now() - interval '10 minutes')
    )
      and attempts < 5
    order by priority desc, next_attempt_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 50))
  ), claimed as (
    update public.email_outbox o
    set status = 'processing', attempts = o.attempts + 1, locked_at = now(), updated_at = now()
    from candidates c
    where o.id = c.id
    returning o.*
  )
  select * from claimed;
$$;

create or replace function public.expire_stale_email_outbox()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare updated_count integer;
begin
  update public.email_outbox
  set status = 'failed', last_error = coalesce(last_error, 'Limite de tentativas excedido.'), updated_at = now()
  where status in ('pending', 'processing') and attempts >= 5;
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

alter table public.email_templates enable row level security;
alter table public.email_outbox enable row level security;
alter table public.automation_rules enable row level security;
alter table public.automation_runs enable row level security;

drop policy if exists "email templates: president manages" on public.email_templates;
create policy "email templates: president manages" on public.email_templates for all to authenticated using (public.is_president()) with check (public.is_president());
drop policy if exists "email outbox: president reads" on public.email_outbox;
create policy "email outbox: president reads" on public.email_outbox for select to authenticated using (public.is_president());
drop policy if exists "email outbox: recipient reads" on public.email_outbox;
create policy "email outbox: recipient reads" on public.email_outbox for select to authenticated using ((select auth.uid()) = recipient_profile_id);
drop policy if exists "automation rules: president manages" on public.automation_rules;
create policy "automation rules: president manages" on public.automation_rules for all to authenticated using (public.is_president()) with check (public.is_president());
drop policy if exists "automation runs: president reads" on public.automation_runs;
create policy "automation runs: president reads" on public.automation_runs for select to authenticated using (public.is_president());

insert into public.email_templates (template_key, name, description, subject_template, html_template, is_system)
values
  ('order_status', 'Atualização de pedido', 'Notificação transacional de mudança de status.', 'Pedido #{{orderNumber}}: {{statusLabel}}', '<p>Seu pedido <strong>#{{orderNumber}}</strong> agora está em <strong>{{statusLabel}}</strong>.</p>', true),
  ('event_reminder', 'Lembrete de evento', 'Lembrete enviado antes de evento confirmado.', 'Amanhã: {{eventTitle}}', '<p><strong>{{eventTitle}}</strong> acontece em {{eventDate}}.</p><p>Local: <strong>{{eventVenue}}</strong>.</p>', true)
on conflict (template_key) do nothing;
