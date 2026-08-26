# Execução controlada — RBAC de múltiplos papéis em Production

**Data:** 21 de agosto de 2026  
**Ambiente:** Supabase Production (`tbxihkzuyzszrfxqmleq`)  
**Código promovido:** pull request #21, já mesclada em `main`  
**Escopo:** compatibilizar o banco de Production com o suporte já publicado a atribuições cumulativas.

## Autorização e salvaguardas

A aplicação foi realizada após confirmação explícita da Presidência. Foi executado exclusivamente o arquivo `supabase/migrations/20260820210000_profile_role_assignments.sql`, dentro de uma única transação PostgreSQL.

> A migração não altera preços, estoque, pedidos, pagamentos, eventos, clientes nem credenciais. Ela preserva o papel existente de cada perfil como primeira atribuição.

## Resultado observado

O editor SQL do Supabase retornou **`Success. No rows returned`** após a execução completa do bloco transacional.

| Controle | Resultado |
|---|---|
| Tabela `profile_role_assignments` | Criada com chave primária composta, referência a `profiles` e RLS habilitada |
| Backfill inicial | Executado de forma idempotente a partir de `profiles.role` |
| Helpers de autorização | `current_user_roles`, `has_any_role`, `is_admin`, `is_staff` e `can_manage_catalog` atualizados |
| Administração de atribuições | `replace_profile_roles` criada com trava transacional, proteção do último administrador e exigência de Presidência |
| Compatibilidade | `profiles.role` e `current_role()` preservados apenas para integrações legadas durante a transição |
| Exposição direta | Sem permissões diretas de tabela para `anon` ou `authenticated`; acesso ocorre pelas funções autorizadas |

## Evidência anterior de homologação

Antes da promoção, a combinação sintética **Cliente + Caixa + Backoffice** foi validada no Preview: ODS, Pedidos e Relatórios permaneceram permitidos; Catálogo administrativo permaneceu negado. A conta sintética foi excluída após o ensaio.

## Pós-condição

Production e homologação possuem agora a mesma estrutura de persistência para papéis acumulados. O gate `PAYMENTS_ENABLED=false` não foi modificado.
