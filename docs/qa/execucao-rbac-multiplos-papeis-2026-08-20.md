# Execução controlada — RBAC com múltiplas atribuições

## Escopo

Este registro acompanha exclusivamente a aplicação e a validação da migração `20260820210000_profile_role_assignments.sql` no projeto Supabase de homologação `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`).

## Pré-condições confirmadas

- A aplicação da migração foi confirmada explicitamente para **homologação**, sem autorização para Production.
- O editor SQL autenticado do ambiente de homologação foi aberto em 20 de agosto de 2026.
- A migração mantém `profiles.role` como compatibilidade e torna `profile_role_assignments` a fonte de verdade para autorização cumulativa.
- A validação posterior usará apenas uma identidade sintética com domínio `qa-%@atleticafsa.test`, sem alterar pagamentos, estoque, preços ou pedidos.

## Ocorrência durante a aplicação

Em 20 de agosto de 2026, a execução automatizada pelo editor SQL retornou o erro de interface `Too small: expected string to have >=1 characters`, sem resultado de migração. O mesmo comportamento intermitente já havia ocorrido em validações anteriores do Supabase. Nenhuma evidência de aplicação parcial foi produzida; a continuidade exige execução manual do arquivo versionado no mesmo editor, seguida de consulta de verificação.

## Aplicação manual

A execução manual do arquivo versionado foi concluída no editor SQL de homologação em 20 de agosto de 2026, com o retorno **`Success. No rows returned`**. A próxima etapa é uma consulta somente-leitura para comprovar a criação da tabela, das funções e o preenchimento inicial das atribuições.

## Verificação por consulta

Uma consulta somente-leitura foi inserida para contar perfis e atribuições, confirmar as funções `current_user_roles` e `replace_profile_roles`, e inspecionar o privilégio `SELECT` de `authenticated`. O editor automatizado voltou a apresentar o retorno genérico **`Success. No rows returned`** para a consulta, sem expor a linha de resultado. A verificação estruturada será repetida por execução manual do operador no mesmo editor ou pela validação funcional no Preview.
