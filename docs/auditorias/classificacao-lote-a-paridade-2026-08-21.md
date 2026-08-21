# Classificação de divergências — Auditoria de Paridade, Lote A

**Data:** 21 de agosto de 2026  
**Escopo:** classificação baseada nas consultas de leitura e nas correções controladas registradas em `evidencias-lote-a-paridade-2026-08-21.md`.

## Síntese executiva

Os controles de estrutura e autorização auditados coincidem entre homologação e Production: enum de papéis, 47 tabelas públicas, políticas RLS por contagem, funções `SECURITY DEFINER`, permissões P0 e a tabela de atribuições cumulativas de papéis. Os incidentes operacionais de cron e Sympla foram recuperados, e a única divergência de schema foi reconciliada de forma controlada em Production.

| Item verificado | Estado comprovado | Classificação | Ação requerida antes de nova promoção |
| --- | --- | --- | --- |
| Enum `user_role`, 74 políticas RLS, 48 funções `SECURITY DEFINER`, 21 grants `anon` e `profile_role_assignments` | Coincidem entre os ambientes | Conforme | Manter como baseline de controle. |
| Grants de `claim_email_outbox`, `expire_stale_email_outbox` e `settle_paid_event_ticket` | `anon` e `authenticated` não executam em ambos os ambientes | Conforme P0 | Não reabrir grants; preservar a migration de endurecimento. |
| Tabelas públicas | Production: 47; homologação: 47 | Conforme após reconciliação | `public.table_name` foi removida sem `CASCADE`, após validação prévia de vazio e ausência de dependências. |
| Referência a `integration_health` no roteiro | O schema atual possui `integration_health_states` | **Documentação desatualizada** | Corrigir a nomenclatura nos roteiros e consultas futuras. |
| Estado `cron_routes` em Production | `healthy`; quatro rotas reavaliadas em 2026-08-21 | Conforme após recuperação | Manter a verificação semanal e o alerta de recuperação deduplicado. |
| Estado `sync` e dead letters Sympla em Production | `healthy`; 0 dead letters abertas | Conforme após recuperação | Manter sincronização autenticada e reprocessamento auditável como controles permanentes. |
| Fila de e-mail | Production: 0 itens em `email_outbox`; homologação: 1 | Observação operacional | Validar somente em teste controlado de e-mail; não é bloqueio isolado. |

> O Lote A incluiu somente correções explicitamente autorizadas: atualização controlada das credenciais de integração, reexecução segura de rotas cron, replay individual de duas dead letters e remoção sem `CASCADE` de `public.table_name`, artefato vazio e não referenciado. Não houve alteração de dados de domínio, estoque, preços, pedidos, pagamentos, grants P0 ou do gate `PAYMENTS_ENABLED=false`.

## Gate para continuidade

O Lote A está encerrado e libera a continuidade para os lotes seguintes, desde que cada mudança preserve os gates existentes, especialmente `PAYMENTS_ENABLED=false`, e disponha de migração versionada, testes, evidência por ambiente e rollback proporcional ao risco. A rotação de segredos que foram compartilhados durante a validação permanece uma pendência operacional prioritária.
