# Mercado Pago — Notas de integração

O fluxo de pagamento online será implementado com **Checkout Pro** e terá uma rota de webhook exclusiva. A preferência criada pelo servidor deve conter a URL de notificação do aplicativo e uma referência externa que corresponda ao ID do pedido interno. A confirmação de pagamento não deve depender apenas do retorno do navegador: o webhook precisa ser validado e o pagamento consultado na API do provedor antes de atualizar o pedido.

O Mercado Pago envia uma assinatura no cabeçalho `x-signature` para notificações Webhook. O projeto reservará a variável privada `MERCADO_PAGO_WEBHOOK_SECRET` para validar a assinatura e manterá a atualização de pagamento idempotente pelo identificador de pagamento do provedor.

## Referências oficiais

1. [Checkout Pro — visão geral](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview)
2. [Webhooks — Mercado Pago Developers](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications/webhooks)
3. [Configurar notificações de pagamento](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications)
