# Validação Operacional — Slack, Cron e Mercado Pago

**Projeto:** ATLETICA FSA  
**Data:** 15 de agosto de 2026  
**Escopo:** alerta Slack, diagnóstico de cron e Webhook Mercado Pago.

## Resultado consolidado

| Componente | Método de validação | Resultado |
| --- | --- | --- |
| Alerta Slack | Uma única mensagem técnica autorizada enviada ao Incoming Webhook configurado em Production e Preview. | **HTTP 200**; entrega aceita pelo Slack. Nenhum fluxo comercial foi acionado. |
| Diagnóstico de cron | Execução local de `pnpm diagnose:cron -- --json --allow-missing`, com consultas `SELECT` à tabela de heartbeats. | Script concluído em modo somente leitura. Os três jobs aparecem como `missing`, esperado antes da primeira janela automática da agenda recém-publicada. |
| Webhook Mercado Pago | `POST` de diagnóstico sem assinatura e sem referência comercial para a rota produtiva. | **HTTP 200**; tópico não comercial tratado como ignorado. Nenhum pagamento, pedido, ingresso, estoque ou conciliação foi alterado. |

## Limites deliberados da validação Mercado Pago

O teste produtivo não usa `MERCADO_PAGO_WEBHOOK_SECRET` e não reproduz um pagamento. Assim, ele comprova disponibilidade do endpoint, roteamento seguro de tópico desconhecido e ausência de efeito comercial. A validação HMAC SHA-256 permanece coberta pela suíte automatizada; a homologação final deve ser feita pelo simulador oficial do Mercado Pago com uma notificação de ambiente de teste, mantendo `PAYMENTS_ENABLED=false` até a aprovação operacional.

## Próxima evidência esperada

Os cron jobs foram registrados na Vercel, mas ainda não haviam gerado heartbeat no instante desta verificação. Após as próximas janelas em UTC, execute:

```bash
pnpm diagnose:cron -- --json
```

O resultado esperado é `healthy` para as rotas já executadas. Caso o script informe `failed` ou `stale`, consulte primeiro os logs da função Vercel e a tabela `scheduled_route_heartbeats` antes de repetir a execução manual.
