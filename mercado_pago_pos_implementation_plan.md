# Plano Técnico — Integração Mercado Pago Point (POS)

**Sistema:** ATLETICA FSA  
**Status:** especificação pronta; implementação bloqueada até a disponibilização e validação das credenciais e do terminal.  
**Escopo:** venda presencial iniciada pelo ERP/ODS, cobrança na maquininha Point e conciliação automática no mesmo domínio de `orders`, `payments`, estoque e auditoria.

## 1. Decisão de arquitetura

O Mercado Pago Point deve complementar — e não substituir — o fluxo atual de pedido e pagamento online. O ERP cria o pedido interno, preserva seus itens e o valor calculado no servidor, e somente então cria uma *order* do tipo `point` no Mercado Pago. A *order* é roteada ao terminal escolhido; a confirmação é feita exclusivamente pelo webhook e por uma consulta de reconciliação no servidor.

> A integração Point é baseada na criação de uma *order* associada ao pagamento. Após a criação, a ordem é carregada no terminal especificado e o comprador realiza o pagamento presencialmente. [1]

O serviço não aceitará valor, nome de produto, terminal ou estado de pagamento decididos pelo navegador. A fonte de verdade será o pedido interno e, após a tentativa de pagamento, o estado consultado/notificado pelo Mercado Pago.

## 2. Pré-requisitos bloqueadores

| Item | Responsável | Evidência de aceite |
| --- | --- | --- |
| Terminal Point compatível | ATLETICA FSA | Modelo e serial da maquininha; terminal associado à conta vendedora |
| Conta Mercado Pago vendedora | ATLETICA FSA | Conta produtiva com acesso a **Suas integrações** |
| Aplicação Point | ATLETICA FSA | Aplicação criada, Access Token de teste e produção disponíveis pelo canal seguro |
| Loja e ponto de venda | ATLETICA FSA | `store_id`, `pos_id` e terminal configurado no modo **PDV** |
| Webhook público HTTPS | Plataforma | URL produtiva cadastrada e assinatura testada |
| Política operacional | Presidência/Financeiro | Prazo de expiração, cancelamento, estorno, parcelas e impressão definidos |

O Point requer um terminal Smart ou Pro, aplicativo Mercado Pago para login no terminal e conta vendedora. Para Pix presencial, a conta também precisa ter chave Pix cadastrada. [2]

O identificador de terminal deve ser descoberto no backend via a API de terminais. A documentação recomenda filtrar por `store_id` e `pos_id`; o sufixo do `id` retornado corresponde ao serial visível na etiqueta do dispositivo. [3]

## 3. Dados e migração proposta

Não reutilizar `external_reference` para dados pessoais. Ela deverá ser determinística, curta e sem PII, por exemplo `fsa-pos-<order_uuid_curto>`. O Mercado Pago limita a referência externa a 64 caracteres e aceita letras, números, hífen e sublinhado. [3]

Criar uma migration versionada com uma tabela de tentativas, mantendo `orders` e `payments` como registros de negócio:

| Estrutura | Campos essenciais | Finalidade |
| --- | --- | --- |
| `pos_terminals` | `id`, `mercado_pago_terminal_id`, `store_id`, `pos_id`, `label`, `active`, `last_seen_at` | Terminais permitidos, identificados no servidor; nenhum segredo fica nesta tabela. |
| `pos_payment_attempts` | `id`, `order_id`, `terminal_id`, `provider_order_id`, `provider_payment_id`, `idempotency_key`, `external_reference`, `status`, `status_detail`, `amount_cents`, `expires_at`, `created_by`, `created_at`, `updated_at` | Liga pedido interno, tentativa local e ordem Point. `provider_order_id` e `idempotency_key` devem ser únicos. |
| `payment_provider_events` | `id`, `provider`, `provider_event_id`, `action`, `payload_hash`, `received_at`, `processed_at`, `outcome` | Deduplicação e auditoria de webhooks/reprocessamentos. Chave única por provedor + evento. |

Adicionar referências opcionais em `payments` (`provider = mercado_pago_point`, `provider_payment_id`, `provider_order_id`) para que relatórios não precisem depender da tabela de tentativas. Toda mutation deverá passar por RPC transacional, com bloqueio do pedido e atualização condicional de status.

## 4. Contratos com o Mercado Pago

Os acessos ao Mercado Pago saem apenas do servidor, com `Authorization: Bearer <Access Token>`. O frontend jamais recebe o Access Token.

| Objetivo | Contrato externo | Uso no ATLETICA FSA |
| --- | --- | --- |
| Descobrir terminais | `GET https://api.mercadopago.com/terminals/v1/list?limit=50&offset=0&store_id=<id>&pos_id=<id>` | Atualizar seleção de terminais permitidos e conferir modo PDV. [3] |
| Criar cobrança presencial | `POST https://api.mercadopago.com/v1/orders` | Enviar `type: "point"`, referência externa, valor calculado, expiração, `terminal_id` e chave de idempotência. [3] |
| Consultar estado | `GET /v1/orders/{provider_order_id}` | Reconciliação do estado após webhook, timeout ou ação manual de conferência. |
| Cancelar cobrança aberta | Operação de cancelamento da *order* da API Point | Cancelar apenas tentativa ainda não liquidada; nunca desfazer um pagamento aprovado sem fluxo de estorno. [1] |
| Homologar status | `POST /v1/orders/{provider_order_id}/events` (somente testes) | Simular `processed` e `failed`; não usar com token produtivo. [4] |

O `POST /v1/orders` deve incluir, no mínimo, `type: "point"`, `external_reference`, `transactions.payments[0].amount` com duas casas decimais, `config.point.terminal_id` e o cabeçalho `X-Idempotency-Key`. A chave de idempotência única é obrigatória para evitar cobranças duplicadas. O terminal precisa estar no modo PDV. [3]

### Exemplo de payload externo — criado somente no servidor

```json
{
  "type": "point",
  "external_reference": "fsa-pos-8f2a4c10",
  "expiration_time": "PT15M",
  "transactions": {
    "payments": [{ "amount": "69.90" }]
  },
  "config": {
    "point": {
      "terminal_id": "<terminal_id_validado>",
      "print_on_terminal": "no_ticket"
    }
  },
  "description": "Pedido ATLETICA FSA #1042"
}
```

O valor acima é derivado de `orders.total_cents / 100` no servidor. As parcelas e quem absorve os juros só serão incluídos depois de política aprovada na conta Mercado Pago.

## 5. Endpoints internos propostos

Os endpoints internos serão protegidos por sessão Bearer e RBAC. `admin` pode configurar, cancelar, reconciliar e estornar conforme a política. `caixa` pode listar terminais ativos e iniciar uma cobrança de pedido elegível. `cozinha/backoffice` não pode criar cobranças financeiras.

| Método e rota interna | Papel mínimo | Função | Resposta principal |
| --- | --- | --- | --- |
| `GET /api/admin/pos/terminals` | `caixa` | Consulta terminais locais ativos; opcionalmente sincroniza no servidor com a API Point. | Lista com `id`, rótulo, terminal, ponto de venda e disponibilidade. |
| `POST /api/admin/pos/orders` | `caixa` | Cria tentativa Point para um pedido pendente e terminal permitido. | `attemptId`, `providerOrderId`, `status`, `expiresAt`. |
| `GET /api/admin/pos/orders/:attemptId` | `caixa` | Lê tentativa, estado interno e última atualização do provedor. | Estado normalizado, sem credenciais. |
| `POST /api/admin/pos/orders/:attemptId/cancel` | `admin` ou `caixa` autorizado | Cancela tentativa aberta conforme regra de expiração. | Estado final e motivo. |
| `POST /api/admin/pos/orders/:attemptId/reconcile` | `admin` | Consulta a *order* no provedor, registra auditoria e aplica somente transição válida. | Estado reconciliado. |
| `POST /api/payments/mercado-pago/webhook` | Público, assinado | **Estender a rota existente** para tratar notificações Checkout Pro e `order.*` Point por tipo/ação. | `200/201` rápido e idempotente. |

Não criar uma rota pública que aceite `orderId`, total ou status declarados pelo cliente. A rota de criação receberá apenas `orderId` interno e `terminalId` local. O servidor verifica RBAC, bloqueia o pedido, confere se ele está elegível, calcula o total e usa o terminal local associado ao `mercado_pago_terminal_id` autorizado.

## 6. Fluxo transacional e máquina de estados

1. O caixa cria ou localiza o pedido interno no ERP/ODS. Itens, preço e estoque já são validados no banco.
2. `POST /api/admin/pos/orders` exige que o pedido esteja em `aguardando_pagamento`, com reserva ativa e sem outra tentativa Point aberta.
3. Em uma transação, a aplicação bloqueia o pedido e cria `pos_payment_attempts` com `idempotency_key` e estado `creating`.
4. O servidor cria a *order* Point. Em sucesso, persiste IDs externos e marca a tentativa como `created`; falha de criação não confirma pedido nem baixa estoque.
5. A maquininha recebe a cobrança. `created` e `at_terminal` permanecem como pagamento pendente; o ODS mostra “aguardando pagamento presencial”.
6. O webhook recebe a notificação, deduplica o evento, valida assinatura, consulta a *order* do provedor e compara referência, IDs e valor em centavos.
7. Somente `processed`/equivalente aprovado efetiva a transição atômica do pedido para `pago`, grava `payments`, preserva/consome a reserva conforme a regra já existente e atualiza o ODS.
8. `failed`, `expired` ou `cancelled` encerra a tentativa sem marcar pagamento. A reserva só é liberada pela política de expiração/cancelamento, nunca por uma resposta parcial do cliente.

| Estado da tentativa Point | Estado do pedido | Ação no estoque |
| --- | --- | --- |
| `creating`, `created`, `at_terminal` | `aguardando_pagamento` | Reserva preservada |
| `processed` e valor confirmado | `pago` | Baixa idempotente/consumo da reserva |
| `failed`, `expired`, `cancelled` | Permanece pendente ou cancela por regra explícita | Reserva preservada ou liberada pela regra de negócio |
| `refunded` | Estado de estorno controlado | Movimento inverso somente após política de devolução |

## 7. Segurança e confiabilidade

| Risco | Controle exigido |
| --- | --- |
| Cobrança duplicada | `X-Idempotency-Key` único no provedor, índice único local, lock transacional por pedido e proibição de duas tentativas abertas. |
| Falso pagamento | O cliente não confirma pagamento; webhook assinado + consulta do provedor + comparação de valor, referência e IDs. |
| Replay de webhook | Validar HMAC/timestamp conforme contrato vigente, persistir ID/hash do evento e tornar a liquidação idempotente. |
| Terminal não autorizado | Seleção limitada a `pos_terminals.active`; validar mapeamento local e modo PDV no backend. |
| Vazamento de segredo | Access Token exclusivamente em variável de servidor; sem logs de token, payload sensível ou PII. |
| Pedido expirado | `expiration_time` explícito; bloqueio de confirmação após vencimento, exceto se o provedor comprovar liquidação válida antes do corte. |
| Operação indisponível | Registrar tentativa e erro; permitir reconciliação administrativa; não criar nova cobrança automaticamente sem decisão explícita do caixa. |

Manter `PAYMENTS_ENABLED=false` durante desenvolvimento e homologação. A chave só poderá ser ativada em produção após todos os cenários de aceite e a confirmação expressa da operação comercial.

## 8. Homologação e testes

O Mercado Pago disponibiliza um dispositivo virtual `SBX0000001` para testes e credenciais de teste cujo Access Token começa por `APP_USR`. A documentação orienta que webhooks sejam configurados antes da simulação. Contas de teste não processam pagamento real no terminal físico. [4]

| Caso de aceite | Resultado esperado |
| --- | --- |
| Criar cobrança para terminal ativo | *Order* Point criada uma única vez, associada a pedido interno elegível. |
| Repetir clique/timeout de criação | Mesma tentativa/ordem ou rejeição controlada; nunca duas cobranças. |
| Simular `processed` | Webhook e reconciliação aprovam uma vez, atualizam pagamento/pedido e ODS. |
| Simular `failed` | Pedido não é pago; estoque não sofre baixa indevida. |
| Webhook repetido/desordenado | Nenhuma duplicação de `payments`, estoque ou e-mail. |
| Valor/`external_reference` divergente | Evento é bloqueado e auditado. |
| Terminal desconectado/ordem expirada | Tentativa encerra sem confirmar pagamento; fluxo de reabrir é explícito. |
| Concorrência Checkout Pro × Point | Apenas uma rota pode liquidar o mesmo pedido; a segunda é rejeitada/reconciliada. |

## 9. Sequência de implementação

| Fase | Entrega | Dependência |
| --- | --- | --- |
| 0 | Inventário de terminal, conta, política financeira e credenciais seguras | ATLETICA FSA/Mercado Pago |
| 1 | Migration, RLS, configuração de terminais e contratos TypeScript | Nenhuma credencial produtiva |
| 2 | Cliente server-side Point, idempotência e endpoints internos | Access Token de teste |
| 3 | Extensão do webhook, conciliação, auditoria e atualização do ODS | Webhook de teste configurado |
| 4 | UI do caixa/ODS, cancelamento e reconciliação administrativa | Terminais homologados |
| 5 | Testes unitários, integração em sandbox e aceitação financeira | Dispositivo virtual ou terminal vinculado |
| 6 | Produção controlada, com `PAYMENTS_ENABLED` revisado e aprovação expressa | Todos os critérios anteriores |

## 10. Informações a solicitar antes de codificar

1. Modelo, serial e foto/identificação do terminal Point, além da confirmação de que está vinculado à conta ATLETICA FSA.
2. `store_id`, `pos_id` e rótulo operacional de cada ponto de cobrança.
3. Access Token de **teste** primeiro; o token produtivo será solicitado somente após homologação.
4. URL de produção escolhida para os webhooks e acesso à configuração do aplicativo Mercado Pago.
5. Decisões de negócio: expiração padrão, parcelas, juros, impressão, cancelamento, estorno e quem possui permissão de reconciliação.

## Referências

[1]: https://www.mercadopago.com.br/developers/en/docs/mp-point/payment-processing "Mercado Pago Point — Integrate payment processing"
[2]: https://www.mercadopago.com.br/developers/en/docs/mp-point/overview "Mercado Pago Point — Overview"
[3]: https://www.mercadopago.com.br/developers/en/docs/mp-point/payment-processing "Mercado Pago Point — Create an order"
[4]: https://www.mercadopago.com.br/developers/pt/docs/mp-point/integration-test "Mercado Pago Point — Testar a integração"
