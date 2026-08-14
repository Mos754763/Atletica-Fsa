# Endurecimento de retirada por QR e grants setoriais

**Data:** 14 de agosto de 2026  
**Autor:** Manus AI

## Escopo concluído

Esta entrega substitui o antigo código legível de retirada por um **token UUID opaco**, exibido somente dentro do QR Code do pedido pronto. O token recebe validade de 48 horas, é renovado apenas pelo Backoffice quando necessário e é inutilizado no mesmo commit que registra a retirada. A confirmação passa obrigatoriamente por uma RPC transacional; a antiga política que permitia atualização direta de `orders` por equipe foi removida.

Também foi endurecido o Construtor de Tabelas. Um grant `table:*` agora exige setor, um grant `table:<uuid>` deve pertencer exatamente ao setor da tabela e a auditoria grava as ações normalizadas `create`, `update` e `delete`. Os registros JSONB recebem validação de tipo no PostgreSQL, além da validação já realizada na interface.

| Componente | Garantia implementada |
|---|---|
| QR de retirada | Payload `FSA:PICKUP:<uuid>`; o identificador não é exibido como texto no pedido. |
| Expiração | `pickup_qr_expires_at` é preenchido ao mover para `pronto` e expira em 48 horas. |
| Uso único | A RPC zera token e expiração no mesmo `UPDATE` que grava `entregue`, `picked_up_at` e `picked_up_by`. |
| Concorrência | A função bloqueia a linha de pedido com `SELECT ... FOR UPDATE`; uma segunda leitura encontra o pedido já retirado. [2] [3] |
| Menor privilégio | A confirmação exige papel técnico `admin` ou `cozinha`/Backoffice; `caixa` não confirma retirada no ODS. |
| Grants de tabela | `table:*` vale somente dentro de um setor e `table:<uuid>` só vale para a tabela indicada no mesmo setor. |
| Dados do Construtor | `data_json` deve ser objeto e respeitar os tipos de cada campo ativo. |

## Migrações SQL aplicadas

As duas migrações abaixo foram aplicadas com sucesso no Supabase. Elas são versionadas, idempotentes nas operações estruturais e devem permanecer no repositório como a fonte histórica do esquema.

| Arquivo | Conteúdo principal |
|---|---|
| `supabase/migrations/20260814170000_secure_pickup_tokens_and_table_grants.sql` | Token de retirada, expiração, RPCs atômicas, remoção de atualização direta, validação de grants e reparo da auditoria. |
| `supabase/migrations/20260814171000_validate_builder_records.sql` | Trigger de validação de tipo e obrigatoriedade para `custom_table_records.data_json`. |

O executor generalizado do projeto permite reproduzir a aplicação controlada de uma migração:

```bash
cd /home/ubuntu/Atletica-Fsa
node scripts/apply-migration.mjs supabase/migrations/20260814170000_secure_pickup_tokens_and_table_grants.sql
node scripts/apply-migration.mjs supabase/migrations/20260814171000_validate_builder_records.sql
```

> Não execute novamente essas migrações em produção apenas para testar o fluxo. A aplicação já foi confirmada. Para novas mudanças, crie uma migração com novo identificador cronológico.

## Fluxo operacional de retirada

Quando o Backoffice marca um pedido como pronto, o gatilho de banco gera um UUID novo e define a expiração. A área **Minha conta → Pedidos** transforma apenas esse valor em QR Code. O atendente lê o QR no ODS, que normaliza o prefixo institucional e encaminha o UUID à RPC `confirm_order_pickup_by_qr`.

A função valida o papel do operador, bloqueia o pedido, verifica modalidade `retirada`, situação `pronto`, validade e igualdade do token. Se todos os testes passarem, a mesma transação grava a retirada, invalida o token e cria a linha de histórico. Leituras subsequentes não repetem a entrega: retornam que o pedido já foi retirado.

| Situação no balcão | Conduta do Backoffice |
|---|---|
| QR válido, pedido pronto | Ler o QR e confirmar a retirada pelo botão do ODS. |
| QR expirado | Use a ação de renovação prevista pela RPC `renew_order_pickup_qr`, peça ao cliente para atualizar a página e leia o novo QR. |
| QR de outro pedido ou texto inválido | O ODS recusa a leitura e não altera o pedido. |
| Segunda leitura do mesmo QR | O banco identifica `entregue`/`picked_up_at`; nenhuma retirada adicional é criada. |
| Pedido não pronto | O banco recusa a confirmação; conclua o preparo antes de entregar. |

## Estrutura recomendada de grants por setor

A presidência configura exceções na área **Organização → Permissões explícitas**. Cada concessão deve usar um setor ativo e um dos escopos abaixo.

| Escopo | Quando usar | Exemplo |
|---|---|---|
| `table:*` | A pessoa precisa ver ou operar todas as tabelas de um único setor. | Membro de Marketing com `ver` nas tabelas do setor Marketing. |
| `table:<uuid>` | A pessoa precisa atuar em uma única tabela do seu setor. | Voluntário com `criar` apenas na tabela de calendário do setor Marketing. |

Evite `*` e escopos sem setor para tabelas. O banco passa a rejeitar novas concessões desse tipo. A interface também exige setor e apresenta o catálogo de tabelas para evitar digitação manual de identificadores.

## Verificação executada

| Verificação | Resultado |
|---|---|
| `git diff --check` | Aprovada. |
| `pnpm typecheck` | Aprovada. |
| `pnpm test` | Aprovada: **45 testes** em 17 arquivos. |
| `node scripts/verify-security-hardening.mjs` | Aprovada: RPC bloqueante, remoção de atualização direta, validação de grants e JSONB confirmadas. |
| `node scripts/verify-schema.mjs` | Aprovada: 32 tabelas, 61 políticas e RLS nas 32 tabelas esperadas. |
| `NODE_ENV=production pnpm build` | Aprovado. |

O build mantém apenas os avisos preexistentes do Autoprefixer sobre `start`/`end` em estilos CSS. Eles não interrompem a compilação nem afetam o contrato de segurança desta entrega.

## Referências

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase — Row Level Security"

[2]: https://www.postgresql.org/docs/current/explicit-locking.html "PostgreSQL — Explicit Locking"

[3]: https://www.postgresql.org/docs/current/sql-select.html "PostgreSQL — SELECT / FOR UPDATE"
