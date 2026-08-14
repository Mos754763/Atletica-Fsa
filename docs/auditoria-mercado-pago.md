# Auditoria técnica — Mercado Pago Checkout Pro e Webhooks

**Data de revisão:** 14 de agosto de 2026  
**Escopo:** criação de preferência, conciliação por Webhook, segurança de assinatura, comparação financeira e idempotência.  
**Situação comercial:** o bloqueio `PAYMENTS_ENABLED` permanece desativado. Nenhuma cobrança será iniciada ou conciliada até a liberação comercial deliberada pela ATLETICA FSA.

## Resultado executivo

O fluxo implementado atende aos controles técnicos essenciais de Checkout Pro: os dados comerciais são calculados no servidor, a confirmação não depende da página de retorno, e a notificação é autenticada e reconciliada contra a API do provedor antes de qualquer transição de pedido ou emissão de ingresso. A verificação adotada monta o manifesto no formato `id:${data.id};request-id:${x-request-id};ts:${ts};`, calcula HMAC SHA-256 e compara hashes com proteção contra timing attacks, conforme o procedimento de validação divulgado pelo Mercado Pago.[1]

> As URLs de retorno melhoram a experiência do cliente, mas **não** são consideradas sinal de aprovação. A confirmação operacional é obtida exclusivamente pelo Webhook assinado, seguido da leitura do pagamento na API do Mercado Pago.[2]

| Domínio revisado | Evidência no código | Resultado |
|---|---|---|
| Preço e produtos | `src/app/api/checkout/route.ts` gera itens/preferência a partir de dados persistidos; o navegador não define o total. | Conforme |
| Referência de conciliação | O pedido é enviado como `external_reference`; ingressos usam o prefixo `event:`. | Conforme |
| Assinatura | `verifyMercadoPagoWebhook()` requer `x-signature`, `x-request-id`, `data.id` e segredo de Webhook. | Conforme |
| Verificação remota | O manipulador consulta `GET /v1/payments/{id}` com o token privado antes de decidir o status. | Conforme |
| Valor | `transaction_amount` é normalizado para centavos e comparado com `total_cents` ou `amount_cents`. | Conforme |
| Referência desconhecida | Pedido/inscrição não encontrados são ignorados sem criar pagamento ou alterar estoque. | Conforme |
| Duplicidade | `payments.provider_reference` é único e a liquidação de inventário é protegida por `inventory_committed_at`. | Conforme |
| Falha de estoque após aprovação | A RPC de liquidação bloqueia o pedido, libera reservas e sinaliza necessidade de estorno manual. | Conforme |

## Testes automatizados adicionados

O arquivo `src/lib/payments/mercado-pago.test.ts` cobre a assinatura válida, assinaturas inválidas ou incompletas, igualdade do valor em centavos e divergências de total. A idempotência e o cenário de referência desconhecida permanecem protegidos no caminho de integração: a restrição única de `provider_reference` impede registros duplicados e `settle_paid_order_inventory()` retorna sem nova baixa quando `inventory_committed_at` já está preenchido. A rota retorna `ignored: "unknown_order"` ou `ignored: "unknown_registration"` antes de qualquer mutação para referências inexistentes.

| Cenário | Resposta esperada |
|---|---|
| Assinatura adulterada | HTTP 401 e nenhuma consulta/alteração comercial. |
| Total divergente | HTTP 409 e nenhuma liquidação de estoque ou ingresso. |
| Webhook repetido | Upsert pelo identificador do provedor e liquidação idempotente, sem segunda baixa. |
| Referência ausente ou inexistente | Evento reconhecido como ignorado, sem alterar pedidos, ingressos ou pagamentos. |

## Condições externas antes da ativação comercial

Antes de mudar `PAYMENTS_ENABLED` para verdadeiro em produção, a administração deve configurar a URL HTTPS do Webhook para o ambiente publicado, registrar o segredo de assinatura correspondente e executar testes com credenciais de teste. A documentação também indica que uma URL de notificação configurada por preferência tem precedência sobre a URL geral, devendo ambas apontar de forma consistente para o mesmo endpoint produtivo quando aplicável.[2] [3]

O `MERCADO_PAGO_ACCESS_TOKEN` e o `MERCADO_PAGO_WEBHOOK_SECRET` devem permanecer exclusivamente nos segredos de servidor do provedor de hospedagem. Eles não devem ser expostos por variáveis `NEXT_PUBLIC_*`, no cliente, em URLs ou em commits.

## Referências

[1]: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks "Mercado Pago — Webhooks"
[2]: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications "Mercado Pago — Checkout Pro payment notifications"
[3]: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview "Mercado Pago — Checkout Pro overview"
