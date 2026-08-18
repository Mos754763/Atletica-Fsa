-- Pré-flight SOMENTE LEITURA para a mudança P0 das RPCs de eventos.
-- Não executar este arquivo sem autorização explícita para consultar Production.
-- Não grava, não bloqueia e não expõe dados de clientes.

begin read only;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    (p.proname = 'create_event_registration_ticket' and pg_get_function_identity_arguments(p.oid) = 'p_event_id uuid, p_ticket_lot_id uuid')
    or (p.proname = 'check_in_event_ticket' and pg_get_function_identity_arguments(p.oid) = 'p_check_in_code text')
  )
order by p.proname;

select
  has_table_privilege('authenticated', 'public.event_registrations', 'select') as authenticated_registrations_select,
  has_table_privilege('authenticated', 'public.event_tickets', 'select') as authenticated_tickets_select,
  has_function_privilege('authenticated', 'public.create_event_registration_ticket(uuid, uuid)', 'execute') as registration_rpc_execute,
  has_function_privilege('authenticated', 'public.check_in_event_ticket(text)', 'execute') as checkin_rpc_execute;

select pg_get_functiondef('public.create_event_registration_ticket(uuid, uuid)'::regprocedure) as current_registration_rpc;
select pg_get_functiondef('public.check_in_event_ticket(text)'::regprocedure) as current_checkin_rpc;

rollback;
