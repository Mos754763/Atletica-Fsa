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
