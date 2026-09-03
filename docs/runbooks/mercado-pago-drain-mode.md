# Modo de drenagem do Mercado Pago

Este runbook separa a criação de novas obrigações do processamento de eventos já emitidos. Fechar checkout não deve interromper webhooks, retries ou liquidação.

## Matriz de operação

| Estado | ACCEPT_NEW_CHECKOUTS | PROCESS_PAYMENT_EVENTS | Resultado |
| --- | --- | --- | --- |
| Teste interno sem pagamentos | false | false | Não cria nem processa pagamentos |
| Drain / vendas fechadas | false | true | Não cria checkout; processa obrigações existentes |
| Operação liberada | true | true | Cria checkout e processa eventos |
| Estado proibido | true | false | O runtime bloqueia o checkout antes de criar uma obrigação que não poderia ser conciliada. |

O estado `true/false` é inválido e deve bloquear a promoção. `PAYMENTS_ENABLED` permanece apenas como fallback de migração: cada flag nova ausente recorre a ele individualmente. Portanto, um ambiente pode inadvertidamente misturar uma flag explícita com outra herdada. Em todo rollout, defina **ambas** `ACCEPT_NEW_CHECKOUTS` e `PROCESS_PAYMENT_EVENTS` explicitamente e não dependa desse fallback.

## Fechamento sem indisponibilidade

1. mantenha `PROCESS_PAYMENT_EVENTS=true`;
2. altere somente `ACCEPT_NEW_CHECKOUTS=false` no ambiente alvo;
3. gere um Preview/redeploy e confirme que um checkout novo retorna indisponível;
4. reproduza um webhook sandbox assinado de obrigação anterior e confirme HTTP 200;
5. acompanhe `payment_webhook_events`, pedidos e inscrições até não haver pendências;
6. não remova token ou segredo durante o drain.

## Reabertura

1. configure e valide token e segredo no ambiente correto;
2. mantenha `PROCESS_PAYMENT_EVENTS=true` e valide um replay idempotente;
3. altere `ACCEPT_NEW_CHECKOUTS=true` somente após a conciliação estar saudável;
4. valide checkout sandbox, webhook, settlement e replay antes de promover.

## Emergência

Desligar `PROCESS_PAYMENT_EVENTS` é último recurso. Antes disso, feche novos checkouts. Só desligue o consumidor após comprovar que não existem obrigações abertas e registrar o motivo. O rollback comercial é fechar criação; nunca descartar eventos já recebidos.

Esta PR documenta as variáveis, mas não altera valores na Vercel nem promove deployments.

## Webhook de produção e tópicos permitidos

O endpoint de produção é exatamente `https://atleticafsa.site/api/payments/mercado-pago/webhook` (sem ponto final). A URL mostrada no screenshot com `.../webhook.` é inválida e retorna `404`.

Somente `payment` concilia financeiramente Checkout Pro. A matriz abaixo cobre todos os itens exibidos no painel do screenshot; os itens não aplicáveis retornam `200` com motivo sanitizado se uma notificação chegar, antes de consultar disponibilidade, Supabase ou a API Mercado Pago.

| Item no painel Mercado Pago | Decisão | Comportamento deste endpoint |
| --- | --- | --- |
| **Pagamentos (legacy)** | **Selecionar** (`payment`) | Único tópico que consulta o provedor e pode conciliar pedido ou ingresso. |
| **Pedidos comerciais** | Opcional (`merchant_order`) | Assinatura validada e auditoria idempotente; responde `200 ignored`, sem liquidação. |
| **Envios** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Order (Mercado Pago)** | Desmarcar | Não aplicável; `order` e `orders` recebem `200 ignored`. |
| **Integrações Point** | Desmarcar | Não aplicável; `point_integration` recebe `200 ignored`. |
| **Vinculação de aplicações** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Reclamações** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Alertas de fraude** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Contestações** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Planos e assinaturas** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Delivery (proximity marketplace)** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Wallet Connect** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Card Updater** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Self Service** | Desmarcar | Não aplicável; `200 ignored` se enviado. |
| **Perfil de pago** | Desmarcar | Não aplicável; `200 ignored` se enviado. |

## Rollout seguro, ainda sem checkout real

1. defina explicitamente `ACCEPT_NEW_CHECKOUTS=false` e `PROCESS_PAYMENT_EVENTS=true` no ambiente alvo; a liberação comercial exige autorização posterior explícita;
3. verifique somente os nomes `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` no ambiente correto, sem expor seus valores;
4. corrija URL e tópicos conforme a seção anterior;
5. use primeiro uma simulação sandbox/HML assinada; qualquer simulação ou checkout real em Production exige autorização separada.

A infraestrutura continua sem custo adicional nesta postura, mas transações reais do Mercado Pago podem gerar tarifas do provedor.
