-- P0: funções SECURITY DEFINER não podem ser executadas por papéis públicos.
-- Esta migration é idempotente e deve ser aplicada primeiro em homologação.
-- Rollback: não restaurar EXECUTE a PUBLIC, anon ou authenticated. Caso o worker
-- autorizado falhe, investigar a credencial/role server-side e conceder somente
-- ao papel interno mínimo necessário em uma migration corretiva aprovada.

begin;

-- DB-01: reivindica e expõe itens da fila de e-mail; uso exclusivo de worker server-side.
revoke execute on function public.claim_email_outbox(integer) from public;
revoke execute on function public.claim_email_outbox(integer) from anon;
revoke execute on function public.claim_email_outbox(integer) from authenticated;
grant execute on function public.claim_email_outbox(integer) to service_role;

-- DB-02: liquida inscrição paga; uso exclusivo do webhook validado server-side.
revoke execute on function public.settle_paid_event_ticket(uuid, text, integer, jsonb) from public;
revoke execute on function public.settle_paid_event_ticket(uuid, text, integer, jsonb) from anon;
revoke execute on function public.settle_paid_event_ticket(uuid, text, integer, jsonb) from authenticated;
grant execute on function public.settle_paid_event_ticket(uuid, text, integer, jsonb) to service_role;

-- DB-03: expira trabalhos da fila de e-mail; uso exclusivo de worker server-side.
revoke execute on function public.expire_stale_email_outbox() from public;
revoke execute on function public.expire_stale_email_outbox() from anon;
revoke execute on function public.expire_stale_email_outbox() from authenticated;
grant execute on function public.expire_stale_email_outbox() to service_role;

commit;
