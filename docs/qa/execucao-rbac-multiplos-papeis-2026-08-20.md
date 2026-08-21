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

## Preview para validação funcional

Em 21 de agosto de 2026, o Preview da pull request #21 foi confirmado como `READY` na Vercel, referente ao commit `5974c34`. O login do Preview foi aberto e a preparação da identidade sintética de validação foi iniciada no painel de Auth de homologação. A execução permanecerá limitada a uma conta `qa-%@atleticafsa.test` e a atribuições `caixa` + `cozinha`.

O formulário de Auth de homologação foi carregado com a opção de confirmação automática habilitada. O e-mail sintético de escopo restrito foi preenchido; a criação ainda depende da senha temporária e da confirmação do formulário.

A identidade sintética foi criada e confirmada automaticamente no Auth de homologação, com o identificador `e008d457-ba27-4647-b0f8-d0cdecba4967`. Ela será usada apenas para validar a combinação `caixa` + `cozinha` e será revogada ao final do ensaio.

O editor SQL de homologação foi aberto e está disponível para a atribuição controlada. A próxima consulta incluirá somente o identificador da conta sintética e os papéis `caixa` e `cozinha`, com retorno explícito das atribuições concedidas.

Durante a inserção automatizada da consulta, o editor atualizou sua árvore de elementos e rejeitou a referência anterior. Nenhuma consulta foi executada. O formulário foi atualizado para uma nova tentativa sem mudar o escopo nem os papéis autorizados.

## Atribuições cumulativas confirmadas

Em execução manual controlada, a consulta retornou a conta sintética com o conjunto `{caixa,cozinha,cliente}`. A atribuição `cliente` foi preservada pelo gatilho de criação de perfil; `caixa` e `cozinha` foram adicionadas sem duplicação. O resultado comprova que uma pessoa pode manter atribuições simultâneas e que a tabela de atribuições é a fonte de verdade para a união de permissões.

O Preview de homologação da pull request foi aberto e o e-mail da identidade cumulativa foi informado na tela de login. A próxima etapa é autenticar a conta e validar a apresentação das atribuições e a união dos atalhos operacionais.

A senha temporária da conta sintética foi informada e a autenticação foi submetida no Preview. O formulário exibiu o estado transitório de processamento; o redirecionamento será verificado antes de qualquer navegação para módulos operacionais.

O login foi concluído e a conta apresentou explicitamente `Backoffice · Caixa · Cliente`. A página de conta exibiu, ao mesmo tempo, os atalhos de cliente (loja, eventos, pedidos e segurança) e os atalhos operacionais (ERP e ODS). No ERP, a navegação exibiu a união de módulos permitidos para as atribuições operacionais: `Pedidos`, `Relatórios` e `ODS de pedidos`, sem itens administrativos de catálogo, eventos, membros ou configurações.

O acesso direto ao ODS foi confirmado para a conta cumulativa e exibiu a fila operacional. Em contrapartida, a tentativa direta de acesso a `/admin/catalogo` foi negada e redirecionada para `/conta?acesso=negado`. Assim, a união de papéis preserva as permissões de `cliente`, `caixa` e `cozinha`, sem elevar a conta ao escopo exclusivo de `admin`.

Após confirmação explícita, a lista de usuários de homologação foi revisada antes da revogação. Ela continha apenas a conta administrativa real e a identidade sintética `qa-multirole-e2e-20260821@atleticafsa.test`; somente esta última integra o escopo autorizado de exclusão.

A conta sintética foi selecionada isoladamente e a confirmação de exclusão irreversível identificou o mesmo e-mail de QA. A exclusão foi submetida após a confirmação previamente autorizada; a atualização da lista será verificada antes de encerrar o ensaio.

A lista atualizada do Supabase de homologação confirmou que a identidade sintética não permanece no projeto. Restou apenas a conta administrativa real; o ensaio de múltiplos papéis foi encerrado sem manter credenciais de QA ativas.
