# Evidência de produção — renomeação do papel Backoffice

**Data:** 21 de agosto de 2026  
**Ambiente:** Supabase Production `tbxihkzuyzszrfxqmleq`  
**Pull request:** [#24](https://github.com/Mos754763/Atletica-Fsa/pull/24)  
**Migração aplicada:** `supabase/migrations/20260821120000_rename_cozinha_to_backoffice.sql`

## Escopo autorizado

Após a homologação concluída, foi aplicada em Production a migração transacional que renomeia o valor técnico do enum `public.user_role` de `cozinha` para `backoffice`. A mudança preserva os vínculos existentes em `profiles` e `profile_role_assignments`, e recompõe funções públicas que continham o literal legado dentro da mesma transação.

## Evidências de banco

O editor SQL de Production confirmou os quatro valores finais do enum, na ordem esperada:

| Ordem | Valor do enum |
| --- | --- |
| 1 | `admin` |
| 2 | `backoffice` |
| 3 | `caixa` |
| 4 | `cliente` |

O script possui validação transacional de referências em funções públicas por meio de `pg_get_functiondef(...) LIKE '%cozinha%'`. Como a execução foi confirmada e o enum foi persistido com `backoffice`, a condição de rejeição da própria migração não foi acionada.

## Controles preservados

| Controle | Estado após a migração |
| --- | --- |
| Estoque, preços, pedidos e pagamentos | Não alterados |
| Atribuições cumulativas de papéis | Preservadas pelo rename do enum PostgreSQL |
| RLS e funções de autorização | Recompostas e validadas pela transação |
| `PAYMENTS_ENABLED` em Production | Mantido como `false` |
| Segredos e credenciais | Não consultados, registrados ou versionados |

## Validação de aplicação antes da produção

Em homologação, a PR #24 foi validada com enum final sem `cozinha`, ausência de referências legadas em funções públicas, ERP autenticado e tela de Pessoas apresentando a nomenclatura **Backoffice**. A revisão local registrou 204 testes aprovados, 3 ignorados intencionalmente, typecheck sem erro e build de produção concluído.

## Resultado

A transição técnica foi concluída em homologação e Production com migração versionada, reversão atômica em caso de falha e sem mudança de dados comerciais ou ativação de pagamentos.
