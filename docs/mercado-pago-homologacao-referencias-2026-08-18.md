# Referências oficiais — Homologação Mercado Pago

## Webhooks e notificações

A documentação oficial descreve que notificações chegam por `HTTP POST`, recomenda URLs distintas para teste e produção e orienta a selecionar o evento **Payments** para Checkout Pro. A origem deve ser validada usando a assinatura secreta enviada em `x-signature`, juntamente com `x-request-id` e o identificador `data.id`. URLs informadas durante a criação da preferência têm precedência sobre a URL cadastrada no painel.

Fonte: [Mercado Pago — Webhooks](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks) e [Mercado Pago — Configure payment notifications](https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications).

## Contas de teste

A documentação oficial requer pelo menos uma conta de vendedor para configurar a aplicação e credenciais e uma conta de comprador para simular a compra. Comprador e vendedor devem operar no mesmo país. O painel apresenta usuário, senha e código de verificação da conta de teste; a autenticação pode solicitar esse código de seis dígitos.

Fonte: [Mercado Pago — Test accounts](https://www.mercadopago.com.ar/developers/en/docs/your-integrations/test/accounts).
