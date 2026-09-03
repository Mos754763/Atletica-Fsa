# Gate de lançamento comercial

> O Checkout Pro está implementado no código, mas **pagamentos reais permanecem bloqueados por padrão**. A ativação exige uma decisão operacional explícita e a conclusão de todos os itens abaixo.

## Regra de ativação

O checkout só é iniciado quando `ACCEPT_NEW_CHECKOUTS=true`, `PROCESS_PAYMENT_EVENTS=true` e `MERCADO_PAGO_ACCESS_TOKEN` está válido. O runtime verifica essas condições antes de criar pedido, preferência ou outra obrigação. `PAYMENTS_ENABLED` não é um gate absoluto: ele é apenas o fallback individual de cada flag nova que estiver ausente. Quando as duas flags novas estão definidas, seu valor não altera a decisão.

| Condição | Efeito |
|---|---|
| `ACCEPT_NEW_CHECKOUTS` ausente | Usa `PAYMENTS_ENABLED` como fallback somente para esta flag. |
| `PROCESS_PAYMENT_EVENTS` ausente | Usa `PAYMENTS_ENABLED` como fallback somente para esta flag. |
| `ACCEPT_NEW_CHECKOUTS=false` | Checkout bloqueado por política comercial. |
| `PROCESS_PAYMENT_EVENTS=false` | Checkout bloqueado antes de criar uma obrigação sem consumidor financeiro. |
| Token do Mercado Pago ausente | Checkout bloqueado por configuração incompleta. |
| Ambas as flags novas `true` e token presente | O código permite criar uma preferência; a operação ainda deve cumprir o checklist abaixo. |

## Checklist obrigatório antes da primeira cobrança

| Controle | Evidência exigida |
|---|---|
| Hospedagem comercial | Conta Vercel Pro/equivalente, ou provedor alternativo aprovado. O plano Hobby não é adequado para uso comercial.[1] |
| Segredos de produção | Token de produção e segredo de webhook adicionados exclusivamente ao ambiente de produção. |
| Webhook | URL pública cadastrada no Mercado Pago e evento de teste recebido com assinatura válida. |
| Estoque | Baixa transacional, prevenção de saldo negativo e tratamento de expiração/cancelamento validados. |
| E-mail | Remetente institucional verificado e confirmação de pedido entregue em caixa real. |
| UAT | Compra de baixo valor concluída: checkout, webhook, ODS, retirada e relatório. |
| Operação | Responsável pela conta Mercado Pago, estorno e atendimento definido. |

Não ative `ACCEPT_NEW_CHECKOUTS` para testes de interface. Defina sempre as duas flags novas explicitamente, mantenha `ACCEPT_NEW_CHECKOUTS=false` até a autorização de lançamento e use Sandbox Mercado Pago em Preview ou implantação isolada. O webhook somente concilia `payment`; `merchant_order` é auditado sem liquidação e Order, Point, Envios e demais tópicos são ignorados com HTTP 200.

## Referências

[1]: https://vercel.com/docs/plans/hobby "Vercel — Hobby Plan"
