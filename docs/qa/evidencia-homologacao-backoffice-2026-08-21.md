# Evidência de homologação — renomeação `cozinha` → `backoffice`

**Data:** 21 de agosto de 2026  
**Ambiente:** Supabase de homologação `gfnbdjdqumewspvfxicl`  
**Escopo:** PR #24 — `feat(rbac): rename cozinha role to backoffice`

## Execução

A migração versionada `supabase/migrations/20260821120000_rename_cozinha_to_backoffice.sql` foi aplicada com `ON_ERROR_STOP` habilitado. O cliente PostgreSQL registrou, na ordem, `BEGIN`, três blocos `DO` e `COMMIT`, sem erro.

## Validações de leitura

| Verificação | Resultado | Critério |
| --- | --- | --- |
| Valores de `public.user_role` | `admin`, `backoffice`, `caixa`, `cliente` | Não conter `cozinha`; conter `backoffice`. |
| Atribuições existentes por papel | `admin`: 1 atribuição no conjunto consultado | Consulta concluída sem valor enum legado. |
| Funções públicas com literal `cozinha` | `0` | Não restar corpo de função pública com referência técnica legada. |

As consultas de validação foram executadas somente para leitura. Nenhum produto, preço, estoque, pedido, pagamento ou configuração de pagamento foi modificado. Em particular, esta etapa não modifica a chave operacional `PAYMENTS_ENABLED`.

## Próxima decisão necessária

Com o banco de homologação compatível e o Preview da PR em estado `READY`, a promoção para produção requer confirmação explícita imediatamente antes da execução da mesma migração transacional no projeto `tbxihkzuyzszrfxqmleq`.
