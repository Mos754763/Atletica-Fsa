-- Executar somente em banco isolado, depois das migrations de e-mail.
-- Nada é enviado ao Resend. Toda fixture é desfeita pelo ROLLBACK.
begin;
set local lock_timeout = '2s';
set local statement_timeout = '20s';

select set_config('qa.email_run', gen_random_uuid()::text, true);
select set_config('qa.email_outbox', gen_random_uuid()::text, true);
select set_config('qa.email_early_outbox', gen_random_uuid()::text, true);
select set_config('qa.email_collision_outbox', gen_random_uuid()::text, true);
select set_config('qa.email_president', coalesce((select id::text from public.profiles where is_president limit 1), ''), true);

do $qa$
declare table_name text; function_name text; role_name text;
begin
  foreach table_name in array array['email_webhook_events', 'email_suppressions'] loop
    if not (select relrowsecurity from pg_class where oid = ('public.' || table_name)::regclass) then
      raise exception 'RLS desativada: %', table_name;
    end if;
    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'INSERT,UPDATE,DELETE') then
      raise exception 'Privilégio público excessivo: %', table_name;
    end if;
    if not has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
      or not (select bool_and(has_table_privilege('service_role', 'public.' || table_name, privilege)) from unnest(array['SELECT','INSERT','UPDATE']) privilege) then
      raise exception 'Privilégio necessário ausente: %', table_name;
    end if;
  end loop;
  foreach function_name in array array[
    'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)',
    'public.ingest_resend_email_event(text,text,text,timestamp with time zone,text,jsonb)',
    'public.reconcile_resend_email_delivery(text)'
  ] loop
    foreach role_name in array array['anon', 'authenticated'] loop
      if has_function_privilege(role_name, function_name, 'EXECUTE') then
        raise exception 'RPC privilegiada exposta: % / %', role_name, function_name;
      end if;
    end loop;
  end loop;
end;
$qa$;

set local role service_role;
insert into public.email_outbox (id, dedupe_key, recipient_email, template_key, subject, html, status, locked_at, attempts)
select value::uuid, 'qa:' || value, 'qa-' || current_setting('qa.email_run') || '@example.invalid',
  'qa_email_feedback', 'Somente teste SQL', '<p>Não enviar</p>', 'processing', now(), 1
from unnest(array[current_setting('qa.email_outbox'), current_setting('qa.email_early_outbox'), current_setting('qa.email_collision_outbox')]) as x(value);

do $qa$
declare
  run_id text := current_setting('qa.email_run');
  qa_outbox_id uuid := current_setting('qa.email_outbox')::uuid;
  qa_early_id uuid := current_setting('qa.email_early_outbox')::uuid;
  qa_collision_id uuid := current_setting('qa.email_collision_outbox')::uuid;
  recipient text := 'qa-' || run_id || '@example.invalid';
  result jsonb;
  rejected boolean;
begin
  if not public.finish_email_outbox_delivery(qa_outbox_id, 'qa-message:' || run_id, now()) then
    raise exception 'Finalização não confirmou envio';
  end if;
  if public.finish_email_outbox_delivery(qa_outbox_id, 'qa-message:' || run_id, now()) then
    raise exception 'Finalização repetida aceitou mensagem já finalizada';
  end if;
  if (select count(*) from public.email_deliveries d where d.outbox_id = qa_outbox_id) <> 1 then
    raise exception 'Finalização não criou exatamente uma entrega';
  end if;

  result := public.ingest_resend_email_event('qa-delivered:' || run_id, 'email.delivered', 'qa-message:' || run_id, now(), recipient, '{}');
  if result->>'matchedDelivery' <> 'true' or result->>'duplicate' <> 'false' then
    raise exception 'Evento entregue não foi reconciliado: %', result;
  end if;
  result := public.ingest_resend_email_event('qa-delivered:' || run_id, 'email.delivered', 'qa-message:' || run_id, now(), recipient, '{}');
  if result->>'duplicate' <> 'true' then raise exception 'Evento duplicado não deduplicou'; end if;

  perform public.ingest_resend_email_event('qa-complaint:' || run_id, 'email.complained', 'qa-message:' || run_id, now() - interval '1 minute', '  ' || upper(recipient) || '  ', '{}');
  perform public.ingest_resend_email_event('qa-delivered-late:' || run_id, 'email.delivered', 'qa-message:' || run_id, now() + interval '1 minute', recipient, '{}');
  if (select delivery_status from public.email_deliveries d where d.outbox_id = qa_outbox_id) <> 'complained' then
    raise exception 'Evento entregue rebaixou uma complaint';
  end if;
  if not exists (select 1 from public.email_suppressions s where s.recipient_email = recipient and reason = 'complaint' and active) then
    raise exception 'Complaint não normalizou/persistiu suppression';
  end if;
  if (select count(*) from public.email_webhook_events where event_id = 'qa-delivered:' || run_id) <> 1 then
    raise exception 'Persistência de webhook não é idempotente';
  end if;

  result := public.ingest_resend_email_event('qa-early:' || run_id, 'email.bounced', 'qa-early-message:' || run_id, now(), recipient, '{}');
  if result->>'matchedDelivery' <> 'false' then raise exception 'Evento antecipado deveria ficar unmatched'; end if;
  perform public.finish_email_outbox_delivery(qa_early_id, 'qa-early-message:' || run_id, now());
  if (select delivery_status from public.email_deliveries d where d.outbox_id = qa_early_id) <> 'bounced'
    or (select status from public.email_webhook_events where event_id = 'qa-early:' || run_id) <> 'processed' then
    raise exception 'Evento antecipado não foi reconciliado ao finalizar';
  end if;
  perform public.ingest_resend_email_event('qa-suppressed:' || run_id, 'email.suppressed', 'qa-unmatched:' || run_id, now(), recipient, '{}');
  if (select count(*) from public.email_suppressions s where s.recipient_email = recipient and active) <> 3 then
    raise exception 'Razões distintas de suppression não foram preservadas';
  end if;

  rejected := false;
  begin
    perform public.finish_email_outbox_delivery(qa_collision_id, ' ', now());
  exception when others then rejected := true;
  end;
  if not rejected then raise exception 'provider_message_id vazio foi aceito'; end if;

  -- Duas outboxes não podem ser marcadas como sent para uma só entrega.
  rejected := false;
  begin
    perform public.finish_email_outbox_delivery(qa_collision_id, 'qa-message:' || run_id, now());
  exception when unique_violation then rejected := true;
  end;
  if not rejected then raise exception 'Colisão de provider_message_id foi tratada como sucesso'; end if;
  if (select status from public.email_outbox where id = qa_collision_id) <> 'processing' then
    raise exception 'Colisão não reverteu atomicamente o status da outbox';
  end if;
end;
$qa$;

reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;
do $qa$
declare rejected boolean := false;
begin
  if exists (select 1 from public.email_webhook_events where event_id like 'qa-%:' || current_setting('qa.email_run'))
    or exists (select 1 from public.email_suppressions where recipient_email = 'qa-' || current_setting('qa.email_run') || '@example.invalid') then
    raise exception 'RLS expôs feedback a usuário não presidente';
  end if;
  begin
    perform public.finish_email_outbox_delivery(current_setting('qa.email_outbox')::uuid, 'qa-denied', now());
  exception when insufficient_privilege then rejected := true;
  end;
  if not rejected then raise exception 'authenticated executou a RPC do worker'; end if;
end;
$qa$;

reset role;
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('qa.email_president'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $qa$
begin
  if current_setting('qa.email_president') = '' then raise exception 'Homologação sem presidente para validar leitura autorizada'; end if;
  if (select count(*) from public.email_suppressions where recipient_email = 'qa-' || current_setting('qa.email_run') || '@example.invalid') <> 3 then
    raise exception 'RLS bloqueou a leitura do presidente';
  end if;
end;
$qa$;
reset role;
rollback;
select 'passed' as email_feedback_sql_tests, 'fixtures reverted; no provider requests' as safety;
