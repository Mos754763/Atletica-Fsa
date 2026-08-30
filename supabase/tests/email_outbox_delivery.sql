begin;

select plan(16);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'email_deliveries'
      and column_name = 'outbox_id' and data_type = 'uuid' and is_nullable = 'YES'
  ),
  'email_deliveries.outbox_id is a nullable uuid'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conname = 'email_deliveries_outbox_id_fkey'
      and conrelid = 'public.email_deliveries'::regclass
  ),
  'outbox foreign key exists'
);

select ok(
  (select count(*) = 1 from pg_indexes
   where schemaname = 'public' and tablename = 'email_deliveries'
     and indexname = 'email_deliveries_outbox_id_key'
     and indexdef like 'CREATE UNIQUE INDEX%' and indexdef like '%WHERE (outbox_id IS NOT NULL)%'),
  'outbox id has a unique partial index'
);

select ok(
  (select count(*) = 1 from pg_indexes
   where schemaname = 'public' and tablename = 'email_deliveries'
     and indexname = 'email_deliveries_provider_message_id_key'
     and indexdef like 'CREATE UNIQUE INDEX%' and indexdef like '%WHERE (provider_message_id IS NOT NULL)%'),
  'provider message id has a unique partial index'
);

select ok(
  to_regprocedure('public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)') is not null,
  'finish function exists'
);

select ok(
  (select prosecdef from pg_proc where oid = 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure),
  'finish function is security definer'
);

select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure),
  'search_path=""',
  'finish function has an empty search path'
);

select ok(not has_function_privilege('public', 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure, 'EXECUTE'), 'PUBLIC cannot execute finish function');
select ok(not has_function_privilege('anon', 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure, 'EXECUTE'), 'anon cannot execute finish function');
select ok(not has_function_privilege('authenticated', 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure, 'EXECUTE'), 'authenticated cannot execute finish function');
select ok(has_function_privilege('service_role', 'public.finish_email_outbox_delivery(uuid,text,timestamp with time zone)'::regprocedure, 'EXECUTE'), 'service_role can execute finish function');

create temporary table email_outbox_delivery_test_ids (first_id uuid, second_id uuid) on commit drop;

with first_outbox as (
  insert into public.email_outbox (dedupe_key, recipient_email, template_key, subject, html, status, attempts, next_attempt_at, locked_at)
  values ('pr39-pgtap-' || txid_current()::text || '-first', 'pr39-pgtap@invalid.test', 'pr39_pgtap', 'PR39 pgTAP', '<p>rollback-only</p>', 'processing', 1, now(), now())
  returning id
), second_outbox as (
  insert into public.email_outbox (dedupe_key, recipient_email, template_key, subject, html, status, attempts, next_attempt_at, locked_at)
  values ('pr39-pgtap-' || txid_current()::text || '-second', 'pr39-pgtap@invalid.test', 'pr39_pgtap', 'PR39 pgTAP', '<p>rollback-only</p>', 'processing', 1, now(), now())
  returning id
)
insert into email_outbox_delivery_test_ids (first_id, second_id)
select first_outbox.id, second_outbox.id from first_outbox cross join second_outbox;

select is(
  public.finish_email_outbox_delivery((select first_id from email_outbox_delivery_test_ids), 'pr39-pgtap-provider-' || txid_current()::text, now()),
  true,
  'first finalization succeeds'
);

select throws_ok(
  format('select public.finish_email_outbox_delivery(%L::uuid, %L, now())', (select second_id::text from email_outbox_delivery_test_ids), 'pr39-pgtap-provider-' || txid_current()::text),
  '23505',
  null,
  'same provider id on a distinct processing outbox raises unique_violation'
);

select is((select status from public.email_outbox where id = (select second_id from email_outbox_delivery_test_ids)), 'processing', 'collision rolls the second outbox back to processing');
select is((select count(*) from public.email_deliveries where outbox_id = (select first_id from email_outbox_delivery_test_ids)), 1::bigint, 'exactly one linked delivery exists');
select is(public.finish_email_outbox_delivery((select first_id from email_outbox_delivery_test_ids), 'pr39-pgtap-provider-' || txid_current()::text, now()), false, 'repeated finalization returns false');

select * from finish();
rollback;
