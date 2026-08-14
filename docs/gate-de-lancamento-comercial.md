# Gate de lançamento comercial

> O Checkout Pro está implementado no código, mas **pagamentos reais permanecem bloqueados por padrão**. A ativação exige uma decisão operacional explícita e a conclusão de todos os itens abaixo.

## Regra de ativação

O checkout só é iniciado quando as duas condições são verdadeiras: `PAYMENTS_ENABLED=true` e `MERCADO_PAGO_ACCESS_TOKEN` válido. A ausência de qualquer uma delas retorna uma resposta controlada, sem criar preferência de cobrança.

| Condição | Efeito |
|---|---|
| `PAYMENTS_ENABLED` ausente ou diferente de `true` | Checkout bloqueado por política de lançamento. |
| Token do Mercado Pago ausente | Checkout bloqueado por configuração incompleta. |
| Ambas as condições presentes | O código permite criar uma preferência; a operação ainda deve cumprir o checklist abaixo. |

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

Não ative `PAYMENTS_ENABLED` para testes de interface. Para isso, utilize Sandbox Mercado Pago em ambiente de Preview ou uma implantação isolada.

## Referências

[1]: https://vercel.com/docs/plans/hobby "Vercel — Hobby Plan"
