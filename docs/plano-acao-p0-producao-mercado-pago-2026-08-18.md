# Plano de ação P0 — Eventos em Production e homologação Mercado Pago

**Data:** 18 de agosto de 2026  
**Escopo:** preparar e controlar a entrada em Production das correções de eventos e concluir a evidência técnica de liquidação Mercado Pago em homologação.  
**Princípio:** nenhuma migração, alteração de credencial, habilitação de pagamentos ou liquidação será feita em Production sem aprovação explícita no ponto de execução.

## 1. Objetivo e limite de mudança

As correções `20260818182000_fix_event_registration_enum.sql` e `20260818190000_fix_checkin_registration_id_ambiguity.sql` já foram aplicadas e validadas na homologação isolada. Elas substituem somente as funções PostgreSQL `create_event_registration_ticket(uuid, uuid)` e `check_in_event_ticket(text)`. A primeira corrige a coerção de `registration_status` na emissão gratuita; a segunda qualifica `ticket.registration_id` para eliminar uma ambiguidade de PL/pgSQL no check-in.

> Esta etapa **não** autoriza novos dados de teste, alteração de `PAYMENTS_ENABLED`, edição de credenciais, mudança de URL de webhook ou liquidação em Production.

| Item | Em Production nesta fase | Em homologação nesta fase |
|---|---:|---:|
| Inscrição gratuita e check-in | Preparar pacote e aprovação; aplicar somente após go/no-go | Já validado com emissão e segundo check-in idempotente |
| Checkout Pro | Manter `PAYMENTS_ENABLED=false` | Validar com credenciais e compradores de teste |
| Webhook Mercado Pago | Manter URL canônica e segredo vigente | Validar assinatura real e replay contra Preview isolado |
| Dados de pedidos, estoque e pagamentos | Não criar nem modificar | Somente produto, pedido e conta de teste isolados |

## 2. Responsáveis e matriz de decisão

| Frente | Responsável pela execução | Responsável pela aprovação | Consultado | Evidência de saída |
|---|---|---|---|---|
| Janela e go/no-go de Production | Engenharia da plataforma | **Moisés Faustino Rodrigues (admin/presidência)** | Backoffice e responsável por eventos | Confirmação escrita da janela, escopo e rollback |
| Pré-checagem das RPCs | Engenharia da plataforma | Admin do Supabase Production | Segurança/RBAC | Resultado das consultas somente leitura e definição atual exportada |
| Aplicação das duas RPCs | Engenharia da plataforma ou DBA autorizado | **Moisés + admin do Supabase** | Backoffice | Log de migração, smoke test aprovado e monitoramento sem erros |
| Observação pós-release | Backoffice de eventos | Moisés | Engenharia | Inscrição e check-in reais sem erro e indicadores estáveis |
| Credenciais e configuração Mercado Pago | Moisés, titular da conta Mercado Pago | **Moisés** | Engenharia | Ambiente Preview isolado, segredo mascarado e evento habilitado |
| Execução da compra sandbox | Operador de teste designado pelo Moisés | **Moisés** | Engenharia | Pagamento aprovado com conta compradora de teste |
| Conciliação e replay | Engenharia da plataforma | Moisés | Backoffice | Pedido, pagamento, estoque e e-mail únicos; evidência de idempotência |

## 3. P0-A — mudança controlada das RPCs de eventos em Production

### Pré-condições obrigatórias

| Controle | Critério de aceite | Responsável |
|---|---|---|
| Aprovação | Moisés confirma a janela, que a mudança é limitada às duas funções e que não haverá evento crítico em curso. | Moisés |
| Fonte | `main` contém `0e08745` ou commit posterior que preserve as duas migrações sem alteração funcional adicional. | Engenharia |
| Qualidade | `pnpm typecheck`, `pnpm test` e build de produção aprovados no commit candidato. | Engenharia/CI |
| Estado de Production | Consultas somente leitura confirmam que os tipos, tabelas, papéis e assinaturas das funções existem antes do `CREATE OR REPLACE`. | Engenharia/DBA |
| Reversão | A definição atual de ambas as funções é exportada por `pg_get_functiondef` e anexada ao registro de mudança antes da aplicação. | DBA |
| Pagamentos | `PAYMENTS_ENABLED=false` confirmado em Production; esta mudança não toca em pagamentos. | Moisés/Engenharia |

### Execução na janela aprovada

1. Registrar horário de início, commit candidato, operador, aprovador e URL da execução no ticket de mudança.
2. Rodar o arquivo somente leitura `scripts/sql/preflight-event-rpcs-production.sql` com conexão de Production autorizada; salvar a saída no registro restrito da mudança, sem exportar dados pessoais.
3. Aplicar **somente** as duas migrações, na ordem de inscrição e check-in. Não combinar com RLS, schema, dados de evento, segredos ou variáveis.
4. Confirmar `grant execute` para `authenticated`, a assinatura exata de cada função e a ausência de erro de compilação PostgreSQL.
5. Com um evento interno autorizado e conta de operação designada, executar apenas o smoke test aprovado: inscrição gratuita, primeiro check-in e segundo check-in idempotente. Se não houver evento interno autorizado, não criar massa de teste em Production; limitar a validação ao plano de observação.
6. Observar logs de aplicação, erros de banco, inscrições e check-ins durante 30 minutos. Critério de estabilização: zero erros de RPC, zero duplicações e nenhuma regressão de autorização.

### Critérios de parada e reversão

Interromper imediatamente se houver erro de compilação, falha em autorização, duplicação de inscrição/ingresso, alteração inesperada de status, degradação de eventos em curso ou qualquer impacto em pagamentos. A reversão consiste em restaurar, via `CREATE OR REPLACE`, as definições capturadas no pré-flight e revogar a janela operacional; não executar `DROP`, limpeza de dados ou alteração manual de registros sem uma nova decisão do responsável.

## 4. P0-B — checklist técnico de homologação Mercado Pago

> A liquidação é uma operação de pagamento, ainda que sandbox. Execute os itens marcados como **interativos** apenas depois de confirmação de Moisés de que a sessão do comprador de teste está isolada e a forma de pagamento exibida pertence ao ambiente de testes.

### 4.1 Preparação e isolamento

| # | Verificação | Método e critério de aceite | Dono | Estado atual |
|---:|---|---|---|---|
| 1 | Ambiente de dados | Preview aponta para `atletica-fsa-homolog`; Production não é consultado nem alterado. | Engenharia | Preparado |
| 2 | Gate de pagamentos | Preview com pagamentos habilitados para sandbox; Production permanece `false`. | Moisés/Engenharia | Preparado |
| 3 | Credenciais | Access token e assinatura são de teste e ficam somente em variáveis server-side. | Moisés | Preparado; não reexpor |
| 4 | Contas de teste | Vendedor e comprador de teste são distintos e do mesmo país; código de verificação disponível ao operador. | Moisés | Requer confirmação no momento do teste |
| 5 | Sessão isolada | Perfil/aba sem carteira, cartão ou cookie de conta real; registrar somente o resultado, nunca senha ou código. | Operador de teste | Pendente |
| 6 | Produto rastreável | Um produto de homologação ativo, preço em centavos e estoque conhecido; nenhum produto real no carrinho. | Backoffice/Engenharia | Preparado anteriormente |

### 4.2 Criação de pedido e Checkout Pro

| # | Verificação | Método e critério de aceite | Dono | Estado |
|---:|---|---|---|---|
| 7 | Recalcular preço no servidor | Comparar produto/quantidade persistidos com a preferência; não aceitar valor do navegador. | Engenharia | Implementado; revalidar por teste |
| 8 | Reserva e pedido | Antes do redirecionamento, existe um pedido `aguardando_pagamento`, itens e histórico; não há baixa definitiva de estoque. | Engenharia | Pendente de liquidação |
| 9 | Preferência | A preferência usa `external_reference` rastreável, URLs de retorno canônicas e `notification_url` coerente com o ambiente de teste. | Engenharia | Criada no ensaio anterior; revalidar |
| 10 | Aprovação sandbox **interativa** | Comprador de teste aprova somente R$ 10,00 de teste ou valor acordado; registrar o identificador de forma mascarada. | Operador/Moisés | Pendente |

### 4.3 Webhook, conciliação e idempotência

| # | Verificação | Método e critério de aceite | Dono | Estado |
|---:|---|---|---|---|
| 11 | Origem | Endpoint recebe `POST` HTTPS; `x-signature`, `x-request-id` e `data.id` passam pela validação HMAC em tempo constante. | Engenharia | Implementado; pendente notificação real |
| 12 | Consulta ao provedor | Webhook não confia no corpo isoladamente: consulta o pagamento no Mercado Pago e compara valor, referência e estado interno. | Engenharia | Implementado; pendente notificação real |
| 13 | Transição financeira | Uma aprovação válida muda o pedido uma única vez, cria uma única linha de `payments` e preenche `paid_at`. | Engenharia | Pendente |
| 14 | Estoque | Há exatamente um movimento de estoque aplicável; replay não reduz saldo novamente. | Engenharia/Backoffice | Pendente |
| 15 | E-mail | Uma comunicação é enfileirada/enviada somente na transição válida; replay não duplica entrega. | Engenharia | Pendente |
| 16 | Replay controlado | Reenviar a mesma notificação assinada ou repetir a entrega permitida pelo provedor; registrar sucesso idempotente sem duplicidades. | Engenharia | Pendente |
| 17 | Rejeição | Payload sem assinatura, assinatura inválida, referência/valor divergente e pagamento não aprovado são rejeitados ou não produzem baixa. | Engenharia | Coberto por testes; reexecutar em Preview |

### 4.4 Encerramento e go/no-go

| # | Verificação | Critério de aceite | Dono |
|---:|---|---|---|
| 18 | Evidências | Guardar IDs mascarados, status de pedido, pagamento, webhook, estoque, e-mail e timestamp em documento restrito. | Engenharia |
| 19 | Limpeza | Expirar/cancelar pedidos de ensaio pendentes conforme máquina de estados; não apagar rastros de auditoria. | Backoffice/Engenharia |
| 20 | Configuração temporária | Se o teste exigir URL Preview ou bypass, restaurar a URL canônica, revogar bypass e confirmar a remoção. | Moisés/Engenharia |
| 21 | Decisão | Moisés assina a evidência. Sem todos os itens 1–20 aprovados, Production permanece com pagamentos desabilitados. | Moisés |

## 5. Evidências e referências

O checklist observa a documentação oficial do Mercado Pago: webhooks usam `HTTP POST`; para Checkout Pro, o tópico de pagamento deve estar habilitado; a validação de autenticidade considera `x-signature`, `x-request-id` e `data.id`; e contas de vendedor e comprador de teste precisam ser distintas e do mesmo país. Consulte [as referências preservadas](./mercado-pago-homologacao-referencias-2026-08-18.md) e os documentos oficiais citados nelas antes da execução interativa.

## 6. Próxima decisão necessária

As ações seguras deste plano são: gerar o pacote de pré-flight, rodar testes locais e documentar a evidência. Para aplicar as funções na base de Production ou aprovar uma compra sandbox, será solicitada uma confirmação operacional específica imediatamente antes da ação, pois ambas alteram sistemas externos ou estados financeiros.

## 7. Execução preparatória realizada

Em 18 de agosto de 2026, a checagem local foi concluída com `pnpm typecheck`, **112 testes aprovados** e 3 testes opt-in mantidos como skip intencional. O build de produção também foi concluído com sucesso; os únicos avisos foram recomendações não bloqueantes do Autoprefixer em `ods.css`, sem erro de TypeScript, página ou rota.

O arquivo `scripts/sql/preflight-event-rpcs-production.sql` foi executado em sessão `BEGIN READ ONLY` seguida de `ROLLBACK` no banco de Production. A consulta confirmou que as duas funções existem, são `SECURITY DEFINER`, têm as assinaturas esperadas e preservam `EXECUTE` para `authenticated`. Não houve inserção, atualização, exclusão, bloqueio de linha ou mudança de definição.

O snapshot da definição atual confirmou que Production ainda contém as duas condições corrigidas na homologação: o `CASE` de inscrição gratuita não faz a coerção explícita para `registration_status`, e a consulta de check-in usa `registration_id` sem o qualificador `ticket.`. Assim, a mudança candidata é necessária e está delimitada; sua **aplicação continua pendente de go/no-go explícito** do aprovador responsável.

## 8. Identidade de homologação confirmada

Foi executada uma verificação somente leitura no Supabase de homologação. A conta administrativa exclusiva `moises.754763@graduacao.fsa.br` possui perfil ativo com papel `admin` e vínculo válido com `auth.users`. Não foi criada, editada, promovida ou teve credencial redefinida nesta etapa. Ela está apta para os ensaios autenticados previstos, desde que a sessão seja iniciada em Preview e não em Production.
