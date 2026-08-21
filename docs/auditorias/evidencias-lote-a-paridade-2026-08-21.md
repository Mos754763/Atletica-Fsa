# Evidências — Lote A de paridade entre homologação e produção

**Data:** 21 de agosto de 2026  
**Escopo:** inventário somente leitura, sem alteração de dados ou configuração.

## Homologação — inventário técnico

Consulta estruturada executada por conexão SSL no projeto de homologação `gfnbdjdqumewspvfxicl`, com `ON_ERROR_STOP=1` e apenas comandos `SELECT`.

| Controle | Resultado em homologação | Critério inicial |
| --- | ---: | --- |
| Valores de `public.user_role` | `admin`, `backoffice`, `caixa`, `cliente` | Deve refletir a renomeação de `cozinha` para `backoffice`. |
| Tabelas base no schema `public` | 47 | Comparar com Production; não é um critério de aprovação isolado. |
| Políticas RLS no schema `public` | 74 | Comparar com Production e investigar qualquer diferença. |
| Funções `SECURITY DEFINER` | 48 | Comparar com Production; exige revisão de privilégios, não apenas contagem. |
| Funções `SECURITY DEFINER` executáveis por `anon` | 21 | Inventário de risco a comparar; não inclui as três funções P0 abaixo. |
| `profile_role_assignments` existe | Sim | Obrigatório para RBAC cumulativo. |
| Dead letters Sympla em aberto | 0 | Não há pendência aberta registrada. |
| Registros em `email_outbox` | 1 | Evidência de fila existente; sem disparo de e-mail. |
| Registros em `email_deliveries` | 0 | Dado operacional; sem alteração. |
| Estado de saúde de integrações | 1 `cron_routes` crítico; 1 `sync` saudável | Comparar com Production e investigar o estado crítico. |

### Funções P0 — grants em homologação

| Função | Existe | `anon` executa | `authenticated` executa | Resultado |
| --- | --- | --- | --- | --- |
| `claim_email_outbox` | Sim | Não | Não | Conforme a migração P0. |
| `expire_stale_email_outbox` | Sim | Não | Não | Conforme a migração P0. |
| `settle_paid_event_ticket` | Sim | Não | Não | Conforme a migração P0. |

> A métrica de dead letters usa `public.event_sync_dead_letters`, que é a tabela versionada para a integração Sympla; a consulta inicial que citava `integration_dead_letters` estava desatualizada e não representa o schema atual.

## Produção — enum de papéis

Consulta executada no SQL Editor do projeto Production `tbxihkzuyzszrfxqmleq`:

```sql
select enumlabel
from pg_enum
where enumtypid = 'public.user_role'::regtype
order by enumsortorder;
```

Resultado confirmado: `admin`, `backoffice`, `caixa`, `cliente`.

**Conclusão parcial:** a renomeação técnica de `cozinha` para `backoffice` está presente em Production. Esta evidência não atesta, por si só, a paridade completa de schema, RLS, funções, variáveis, integrações ou dados entre os ambientes.

## Produção — inventário técnico e operacional

Consultas executadas pelo responsável no SQL Editor do projeto Production `tbxihkzuyzszrfxqmleq`, estritamente com `SELECT`. A primeira versão do inventário referenciava `public.integration_health`, relação que não existe no schema atual. O inventário de tabelas confirmou que o nome versionado é `public.integration_health_states`; nenhuma alteração foi feita em razão desse erro de leitura.

| Controle | Resultado em Production | Resultado em homologação | Situação inicial |
| --- | ---: | ---: | --- |
| Valores de `public.user_role` | `admin`, `backoffice`, `caixa`, `cliente` | `admin`, `backoffice`, `caixa`, `cliente` | Conforme. |
| Tabelas base no schema `public` | 48 | 47 | Divergência a explicar antes de promoção adicional. |
| Políticas RLS no schema `public` | 74 | 74 | Conforme por contagem. |
| Funções `SECURITY DEFINER` | 48 | 48 | Conforme por contagem. |
| Funções `SECURITY DEFINER` executáveis por `anon` | 21 | 21 | Conforme por contagem; manter revisão por função como controle permanente. |
| `profile_role_assignments` existe | Sim | Sim | Conforme; RBAC cumulativo presente. |
| Registros em `email_outbox` | 0 | 1 | Dado operacional, não bloqueador isolado. Não houve envio. |
| Registros em `email_deliveries` | 0 | 0 | Conforme no momento da coleta. |
| Dead letters Sympla em aberto | 2 | 0 | **Bloqueio operacional em Production** até diagnóstico e tratamento auditável. |

### Funções P0 — grants em Production

| Função | Existe | `anon` executa | `authenticated` executa | Resultado |
| --- | --- | --- | --- | --- |
| `claim_email_outbox` | Sim | Não | Não | Conforme a migração P0. |
| `expire_stale_email_outbox` | Sim | Não | Não | Conforme a migração P0. |
| `settle_paid_event_ticket` | Sim | Não | Não | Conforme a migração P0. |

### Saúde de integrações em Production

| Escopo | Estado | Início do incidente | Evidência operacional | Classificação inicial |
| --- | --- | --- | --- | --- |
| `cron_routes` | `critical` | 2026-08-17 18:15 UTC | `/api/cron/integration-health` sem execução registrada (`lastExecutedAt: null`); as rotas Sympla e lembretes do mesmo snapshot estavam saudáveis. | Bloqueadora de produção. |
| `sync` | `critical` | 2026-08-17 18:14 UTC | Há dead letters Sympla abertas; o snapshot registra ao menos uma com idade superior a 3.941 minutos. | Bloqueadora de produção. |

> **Correção de nomenclatura documental:** o schema atual utiliza `public.integration_health_states`, e não `public.integration_health`. A referência anterior deve ser tratada como documentação desatualizada, não como falha de banco.

## Conclusão do Lote A

Os controles de autorização e a estrutura principal comprovadamente coincidem entre os ambientes: enum RBAC, RLS por contagem, quantidade de funções privilegiadas, grants P0 e a tabela de atribuições cumulativas. O Lote A não autoriza nova promoção operacional enquanto houver o incidente crítico sem recuperação da rota de saúde, dead letters Sympla abertas e a tabela adicional de Production sem reconciliação. Nenhuma modificação foi feita em Production durante a auditoria.
