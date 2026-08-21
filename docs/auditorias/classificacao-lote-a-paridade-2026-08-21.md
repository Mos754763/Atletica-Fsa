# Classificação de divergências — Auditoria de Paridade, Lote A

**Data:** 21 de agosto de 2026  
**Escopo:** classificação baseada exclusivamente nas consultas de leitura registradas em `evidencias-lote-a-paridade-2026-08-21.md`.

## Síntese executiva

Os controles de estrutura e autorização auditados coincidem entre homologação e Production: enum de papéis, políticas RLS por contagem, funções `SECURITY DEFINER`, permissões P0 e a tabela de atribuições cumulativas de papéis. Contudo, a auditoria identificou incidentes operacionais críticos em Production que impedem considerar o ambiente plenamente saudável para novas promoções: a rota de verificação de saúde não possui execução registrada e há dead letters Sympla abertas.

| Item verificado | Estado comprovado | Classificação | Ação requerida antes de nova promoção |
| --- | --- | --- | --- |
| Enum `user_role`, 74 políticas RLS, 48 funções `SECURITY DEFINER`, 21 grants `anon` e `profile_role_assignments` | Coincidem entre os ambientes | Conforme | Manter como baseline de controle. |
| Grants de `claim_email_outbox`, `expire_stale_email_outbox` e `settle_paid_event_ticket` | `anon` e `authenticated` não executam em ambos os ambientes | Conforme P0 | Não reabrir grants; preservar a migration de endurecimento. |
| Tabelas públicas | Production: 48; homologação: 47 | **Necessária em homologação** | Identificar a tabela divergente, sua migration e efeito em políticas antes de qualquer promoção de schema. |
| Referência a `integration_health` no roteiro | O schema atual possui `integration_health_states` | **Documentação desatualizada** | Corrigir a nomenclatura nos roteiros e consultas futuras. |
| Estado `cron_routes` em Production | `critical` desde 2026-08-17; `/api/cron/integration-health` sem execução registrada | **Bloqueadora de produção** | Diagnosticar e comprovar recuperação primeiro em homologação, com alerta de recuperação deduplicado. |
| Estado `sync` e dead letters Sympla em Production | `critical` desde 2026-08-17; 2 dead letters abertas | **Bloqueadora de produção** | Diagnosticar causa e validar reprocessamento auditável em homologação antes de decidir qualquer ação em Production. |
| Fila de e-mail | Production: 0 itens em `email_outbox`; homologação: 1 | Observação operacional | Validar somente em teste controlado de e-mail; não é bloqueio isolado. |

> Nenhum dado, grant, configuração, migration ou segredo de Production foi modificado durante o Lote A.

## Gate para continuidade

A auditoria libera somente a investigação e a correção controlada em **homologação**. Uma promoção futura exige, cumulativamente, a reconciliação de schema, uma execução atual da rota de saúde, a recuperação observável do estado crítico, a análise das dead letters e uma nova rodada de evidências somente leitura em ambos os ambientes.
