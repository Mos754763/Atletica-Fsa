# Modo de drenagem do Mercado Pago

Este runbook separa a criação de novas obrigações do processamento de eventos já emitidos. Fechar checkout não deve interromper webhooks, retries ou liquidação.

## Matriz de operação

| Estado | ACCEPT_NEW_CHECKOUTS | PROCESS_PAYMENT_EVENTS | Resultado |
| --- | --- | --- | --- |
| Teste interno sem pagamentos | false | false | Não cria nem processa pagamentos |
| Drain / vendas fechadas | false | true | Não cria checkout; processa obrigações existentes |
| Operação liberada | true | true | Cria checkout e processa eventos |
| Estado proibido | true | false | Cria obrigação que não poderá ser conciliada |

O estado `true/false` é inválido e deve bloquear a promoção. `PAYMENTS_ENABLED` permanece temporariamente como fallback quando as duas variáveis novas não existirem.

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

Para este Checkout Pro, o único produto necessário é **Pagamentos (legacy)**, com o tópico `payment`. **Pedidos comerciais** (`merchant_order`) é opcional: o endpoint confere assinatura e registra uma auditoria idempotente, mas nunca liquida pedido, ingresso ou estoque. Para reduzir ruído e consumo de quota, deixe desmarcados **Envios**, **Order (Mercado Pago)**, **Integrações Point** e todos os demais produtos/tópicos. Se forem selecionados por engano, eles recebem `200` com motivo sanitizado, sem consultar credenciais, Supabase ou a API Mercado Pago.

## Rollout seguro, ainda sem checkout real

1. mantenha `ACCEPT_NEW_CHECKOUTS=false`; a liberação comercial exige autorização posterior explícita;
2. defina e verifique `PROCESS_PAYMENT_EVENTS=true` no ambiente alvo;
3. verifique somente os nomes `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` no ambiente correto, sem expor seus valores;
4. corrija URL e tópicos conforme a seção anterior;
5. use primeiro uma simulação sandbox/HML assinada; qualquer simulação ou checkout real em Production exige autorização separada.

A infraestrutura continua sem custo adicional nesta postura, mas transações reais do Mercado Pago podem gerar tarifas do provedor.
