# Especificação de RBAC com múltiplos papéis por usuário

**Data:** 20 de agosto de 2026
**Escopo:** homologação e produção controlada da ATLETICA FSA

## Objetivo

Uma pessoa poderá acumular quaisquer atribuições necessárias à sua atuação, como **Caixa e Backoffice** ou **Administração, Caixa e Cliente**, sem substituir permissões já concedidas. As permissões efetivas serão a união dos papéis ativos, sempre verificadas no servidor e no banco de dados.

> O papel `cozinha` continua sendo exclusivamente o identificador técnico do Backoffice. A interface continuará exibindo **Backoffice**.

| Papel | Escopo preservado |
| --- | --- |
| `admin` | Administração do ERP, membros, configurações e funcionalidades administrativas autorizadas. |
| `caixa` | Operação de pedidos, ODS e relatórios permitidos. |
| `cozinha` | Backoffice e ODS. |
| `cliente` | Loja, conta pessoal e inscrições próprias em eventos. |

## Modelo de dados e compatibilidade

Será criada a tabela `public.profile_role_assignments`, com uma linha por combinação de perfil e papel. A chave primária composta por `(profile_id, role)` impedirá duplicidades. Cada atribuição armazenará data e responsável pela concessão quando disponível.

A coluna histórica `profiles.role` será mantida temporariamente como papel primário de compatibilidade, sincronizado por trigger com prioridade determinística: `admin`, `caixa`, `cozinha`, `cliente`. Ela não será mais a fonte de verdade para autorizações novas. A migração inicial copiará cada papel existente para a nova tabela antes de as verificações serem alteradas, evitando perda de acesso durante a transição.

| Situação | Resultado esperado |
| --- | --- |
| Perfil existente com `caixa` | Recebe `caixa` em `profile_role_assignments`. |
| Novo perfil criado pelo Supabase Auth | Recebe `cliente` automaticamente. |
| Presidência adiciona `cozinha` a um Caixa | O usuário passa a ter `caixa` e `cozinha`; vê a união de pedidos, relatórios e ODS. |
| Presidência remove `admin` do último administrador | A operação é recusada. |
| Tentativa de remover todos os papéis de um perfil | A operação é recusada. |
| Tentativa do próprio usuário de alterar atribuições | A operação é recusada. |

## Autorização e RLS

As funções de banco passarão a consultar a tabela de atribuições por meio de `current_user_roles()` e `has_any_role(...)`. As políticas RLS, os RPCs de pedidos, o check-in, o ODS e os endpoints administrativos deixarão de inferir acesso a partir de um único valor em `profiles.role`.

A tabela de atribuições terá RLS habilitado e não concederá escrita direta a `anon` ou `authenticated`. Alterações serão feitas somente em ações server-side protegidas por `requirePresident`, usando o cliente de serviço. A regra do último administrador será apurada com base na tabela de atribuições, e não pela coluna legada.

O catálogo administrativo continuará exclusivo de `admin`, conforme a correção de RBAC validada na PR #20. O acúmulo de `caixa` não restabelecerá gestão de catálogo a quem não possuir `admin`.

## Superfícies a atualizar

| Camada | Mudança necessária |
| --- | --- |
| Banco e RLS | Tabela de atribuições, backfill, funções cumulativas, proteção contra conjunto vazio e último administrador, RPCs que consultam um papel único. |
| Guards server-side | `requireRole`, `requireAdminShell` e autenticação de APIs passam a transportar `roles: UserRole[]`. |
| UI de conta e ERP | Rótulos e navegação usam o conjunto de papéis; os atalhos são a união das permissões. |
| Gestão de membros | Convite define o papel inicial; edição usa múltipla seleção e grava a substituição atômica do conjunto. |
| Exportação | A coluna de papéis passa a serializar todos os rótulos aplicáveis. |
| Testes | Cobertura unitária, contrato de fontes e integração em homologação para papéis combinados. |

## Critérios de aceite

1. Um usuário com `caixa` e `cozinha` acessa ODS, pedidos e relatórios, sem receber catálogo, eventos administrativos, membros ou exportações de administrador.
2. Um usuário com `admin` e quaisquer outros papéis mantém acesso administrativo integral e exibe todos os rótulos atribuídos.
3. Um usuário apenas `cliente` continua sem acesso ao ERP e sem visibilidade de dados de outras pessoas.
4. Nenhuma ação de cliente, rota, endpoint, RPC ou política RLS autoriza com base exclusiva em `profiles.role`.
5. A Presidência não consegue remover sua própria atribuição nem deixar a plataforma sem administrador.
6. A migração é idempotente, preserva os papéis atuais e não altera preços, estoque, pedidos, pagamentos ou identidades de usuários.
