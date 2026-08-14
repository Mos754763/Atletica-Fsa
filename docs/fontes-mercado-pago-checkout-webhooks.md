# Fontes oficiais — Mercado Pago

## Checkout Pro

O Checkout Pro é um checkout redirecionado, no qual o comprador conclui o pagamento no ambiente do Mercado Pago. A documentação oficial orienta a sequência: criar a aplicação, configurar ambiente, criar a preferência, definir back URLs, configurar notificações, testar e somente então publicar em produção.[1]

## Notificações e validação

Para Checkout Pro, o evento `payment` deve ser configurado por Webhook em URL HTTPS. A notificação inclui `data.id`; o servidor deve validar sua origem por `x-signature` e `x-request-id`, usando a assinatura secreta criada na configuração de Webhooks. A URL configurada durante a criação de uma preferência tem precedência sobre a URL geral da aplicação.[2] [3]

## Requisitos para a revisão do projeto

| Controle | Aplicação na ATLETICA FSA |
|---|---|
| Preferência no servidor | Preços, produtos e estoque devem vir do banco; nunca do navegador. |
| Retorno de pagamento | Back URLs servem para experiência do cliente, não para confirmar a venda. |
| Webhook | Validar assinatura; buscar o pagamento no provedor; comparar referência externa, valor e status. |
| Idempotência | A mesma notificação não pode baixar estoque ou disparar confirmação duas vezes. |
| Produção | Exigir SSL, conta vendedora e testes com credenciais de teste antes de habilitar pagamentos. |

## Referências

[1]: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/overview "Mercado Pago — Checkout Pro overview"
[2]: https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications "Mercado Pago — Configure payment notifications"
[3]: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications/webhooks "Mercado Pago — Webhooks"
