# Runbook — hardening P0 de grants de funções privilegiadas

## Objetivo e escopo

Este procedimento aplica a migration `20260820100000_harden_privileged_function_grants.sql`. Ela restringe o uso de três funções `SECURITY DEFINER` ao papel interno `service_role`: `claim_email_outbox(integer)`, `settle_paid_event_ticket(uuid, text, integer, jsonb)` e `expire_stale_email_outbox()`.

> A correção reduz a superfície de execução de uma função privilegiada; ela não altera pedido, ingresso, preço, estoque, conteúdo de e-mail ou estado de pagamento.

## Sequência obrigatória

| Etapa | Evidência exigida | Critério para seguir |
|---|---|---|
| Baseline | Consulta de privilégios em homologação registrada sem credenciais | As três funções são `SECURITY DEFINER` e estão publicamente executáveis antes da migration. |
| Revisão local | `pnpm typecheck`, `pnpm test` e `pnpm build` verdes | O teste de contrato encontra todos os revokes e grants esperados. |
| Aplicação | Migration executada uma vez no banco de homologação | A transação termina sem erro. |
| Verificação | Consulta de catálogo em homologação | `anon=false`, `authenticated=false`, `public=false` e `service_role=true` para as três funções. |
| Regressão controlada | Worker/autenticação server-side exercitado sem dados reais | A fila autorizada e o webhook assinado continuam usando o cliente de serviço. |
| Produção | Aprovação explícita da Presidência em PR separado | Nenhuma promoção ocorre antes da homologação e aprovação. |

## Consulta de verificação não destrutiva

Execute a consulta abaixo com uma conexão administrativa do ambiente alvo, sem registrar a URL, senha ou token em logs, commits ou issues.

```sql
select
  p.oid::regprocedure as function_name,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'execute') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute') as service_role_execute,
  has_function_privilege('public', p.oid, 'execute') as public_execute
from pg_proc p
where p.oid in (
  'public.claim_email_outbox(integer)'::regprocedure,
  'public.settle_paid_event_ticket(uuid,text,integer,jsonb)'::regprocedure,
  'public.expire_stale_email_outbox()'::regprocedure
)
order by 1;
```

O resultado aprovado tem `security_definer=true`, `anon_execute=false`, `authenticated_execute=false`, `public_execute=false` e `service_role_execute=true` em cada linha.

## Falha, contenção e rollback seguro

Se a migration, a consulta ou a regressão do worker falhar, interrompa a promoção e registre o resultado sanitizado na PR. Não use rollback que restaure `EXECUTE` para `PUBLIC`, `anon` ou `authenticated`. Caso seja necessário recuperar a operação interna, investigue se o chamador é de fato server-side e, somente depois de revisão, crie uma nova migration que conceda a permissão ao menor papel interno necessário.

Produção permanece bloqueada enquanto esta verificação não estiver aprovada e `PAYMENTS_ENABLED=false` continua obrigatório. O controle de privilégio segue a semântica de `GRANT` e `REVOKE` do PostgreSQL.[1]

## Evidência de homologação — 2026-08-20

| Controle | Resultado observado | Situação |
|---|---|---|
| Baseline de catálogo | As três funções eram `SECURITY DEFINER` e apresentavam `EXECUTE=true` para `anon`, `authenticated`, `service_role` e `PUBLIC`. | Falha P0 confirmada. |
| Aplicação | A migration foi executada em transação no Supabase de homologação, com os nove revokes e três grants concluídos. | Aprovado. |
| Pós-condição de catálogo | Para as três assinaturas: `anon_execute=false`, `authenticated_execute=false`, `public_execute=false`, `service_role_execute=true` e `security_definer=true`. | Aprovado. |
| Teste de contrato | `src/lib/db/function-grants.test.ts` aprovou os sete cenários de grant, ausência de grant público e atomicidade da migration. | Aprovado. |
| Validação local | `pnpm typecheck`, `pnpm test`, `pnpm audit --prod` e `pnpm build` concluíram com sucesso; a suíte registrou 152 testes aprovados e 3 explicitamente ignorados. | Aprovado. |

Esta evidência não simula entrega de e-mail, liquidação financeira nem pagamento. A prova funcional desses fluxos pertence aos testes de homologação específicos de outbox e Mercado Pago; a validação deste P0 comprova exclusivamente o contrato de privilégio e o acesso de `service_role` exigidos pela correção.

## Referências

[1]: https://www.postgresql.org/docs/current/sql-grant.html "PostgreSQL: GRANT"
