# Auditoria de Eventos, Permissões e Webhooks — Mercado Pago

**Projeto:** ATLETICA FSA  
**Atualizado em:** 3 de setembro de 2026
**Responsável técnico:** Manus AI

## Decisão operacional

A ATLETICA FSA já possui uma integração de **Checkout Pro** para vendas na loja e ingressos pagos. A preferência é criada exclusivamente no servidor, com itens, preços e referências externas obtidos do banco; a confirmação do pagamento ocorre somente após Webhook assinado, consulta direta ao provedor, validação de valor e liquidação idempotente de estoque ou ingresso.

> **Regra de lançamento:** mantenha `ACCEPT_NEW_CHECKOUTS=false` e `PROCESS_PAYMENT_EVENTS=true` explicitamente durante o drain em Production e Preview. O primeiro bloqueia novos checkouts antes de criar obrigação; o segundo preserva a conciliação de `payment` já emitido. `PAYMENTS_ENABLED` é somente fallback individual quando uma dessas flags novas está ausente, não um gate absoluto.

Mercado Pago recomenda Webhooks em vez de IPN, pois os Webhooks fornecem assinatura secreta para validação da origem. Os tópicos dependem do produto integrado; habilitar tópicos sem um consumidor validado gera notificações desnecessárias e amplia a superfície operacional. [1]

## O que configurar agora

Na aplicação Mercado Pago utilizada pelo projeto, abra **Webhooks → Configurar notificações**. Cadastre a mesma URL nos ambientes que estiver homologando, usando URLs separadas quando o painel permitir:

| Ambiente | URL | Eventos a habilitar agora | Resultado esperado |
| --- | --- | --- | --- |
| Teste / homologação | URL pública de Preview que corresponda ao commit em teste | **Pagamentos (legacy)** | Receber a notificação de Checkout Pro em ambiente de teste; novos checkouts continuam fechados até autorização explícita. |
| Produção | `https://atleticafsa.site/api/payments/mercado-pago/webhook` | **Pagamentos (legacy)** | Preparar o endereço produtivo para futura liberação após homologação completa. Não use a variante com ponto final (`webhook.`), que é inválida/`404`. |

Depois de salvar, copie o **segredo de assinatura gerado pelo painel** para a variável server-side `MERCADO_PAGO_WEBHOOK_SECRET`. Ele não deve ser exposto no navegador, no GitHub, em imagens ou mensagens. A assinatura recebida no cabeçalho `x-signature` é conferida por HMAC SHA-256, com `x-request-id`, `data.id` e janela de cinco minutos contra replay.

## Matriz de opções do painel

| Opção exibida no painel | Situação no código | Ação no painel |
| --- | --- | --- |
| **Pagamentos (legacy)** | `payment` é o único tópico que consulta o provedor e pode conciliar pedido/ingresso. | **Selecionar.** |
| **Pedidos comerciais** | `merchant_order` exige assinatura e é auditado idempotentemente, mas nunca liquida. | Opcional; normalmente desmarcado para reduzir ruído. |
| **Envios** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Order (Mercado Pago)** | `order` e `orders` não são Checkout Pro; recebem `200 ignored`, não `503`. | **Desmarcar.** |
| **Integrações Point** | `point_integration` recebe `200 ignored`, sem consulta ou liquidação. | **Desmarcar.** |
| **Vinculação de aplicações** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Reclamações** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Alertas de fraude** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Contestações** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Planos e assinaturas** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Delivery (proximity marketplace)** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Wallet Connect** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Card Updater** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Self Service** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |
| **Perfil de pago** | Não aplicável; `200 ignored` se enviado. | **Desmarcar.** |

Os nomes e tópicos da matriz são os documentados pelo Mercado Pago para notificações gerais. A documentação também associa `payment` ao Checkout Pro, `merchant_order` aos pedidos comerciais do Checkout Pro e `order` ao Checkout API, QR Code e Mercado Pago Point. [1] [2]

## Permissões, OAuth e configuração avançada

A aplicação atual opera com a conta Mercado Pago da própria ATLETICA FSA, em fluxo de credencial do próprio integrador. Portanto, ela **não usa OAuth de terceiros** e não deve receber uma URL de redirecionamento OAuth agora.

| Campo de configuração avançada | Configuração recomendada agora | Quando será necessário |
| --- | --- | --- |
| **Redirect URL OAuth** | Deixar vazio. | Somente se a ATLETICA FSA virar uma plataforma que conecte contas Mercado Pago de terceiros. |
| **Authorization Code / PKCE** | Não habilitar. | Apenas com OAuth Authorization Code; PKCE protege a troca do código de autorização. |
| **Permissão de leitura** | Não alterar para esta integração própria. | Relevante ao definir escopos OAuth de contas de terceiros. |
| **Permissão de escrita** | Não alterar para esta integração própria. | Relevante ao definir escopos OAuth de contas de terceiros; exigiria novo fluxo de autorização, token rotativo e auditoria. |
| **Offline access** | Não alterar para esta integração própria. | Necessário quando a plataforma precisar renovar tokens OAuth de vendedores conectados. |

OAuth concede acesso limitado aos recursos de uma conta vendedora em nome dela. O fluxo Authorization Code exige redirecionamento e a documentação recomenda PKCE quando esse fluxo é adotado. As permissões disponíveis incluem leitura, escrita e acesso offline. [3] [4]

## Fase futura: Mercado Pago Point

O Point integrado exige terminal compatível, conta vendedora, configuração do terminal, criação da ordem pelo sistema, apresentação automática na maquininha e notificação final do estado. A documentação do Point lista `order.processed`, `order.canceled`, `order.refunded`, `order.action_required`, `order.failed` e `order.expired` como alertas da Order API. [5] [6]

Antes de habilitar **Order (Mercado Pago)**, deve-se concluir estes critérios de aceite:

1. Registrar o terminal real e suas credenciais de homologação, sem inserir segredos no repositório.
2. Aplicar as migrations de `pos_terminals`, `pos_payment_attempts` e eventos do provedor já especificadas no repositório.
3. Implementar os endpoints internos de criação, consulta e cancelamento de ordem Point.
4. Estender o webhook para consultar e conciliar a ordem Point, validar referência externa, valor, terminal e transições idempotentes.
5. Executar a matriz de testes de concorrência, reenvio de Webhook, valor divergente, evento duplicado, terminal indisponível, expiração e reembolso.
6. Somente então redesenhar e homologar uma rota específica de Point; o endpoint Checkout Pro atual continuará ignorando Order. Qualquer rollout comercial futuro deve definir `ACCEPT_NEW_CHECKOUTS=true` e `PROCESS_PAYMENT_EVENTS=true` explicitamente.

## Alteração interna entregue nesta auditoria

O webhook classifica notificações por tópico antes de iniciar disponibilidade, acesso a Supabase ou chamada ao provedor. Somente `payment` preserva o fluxo de conciliação. `merchant_order` é validado e registrado como ignorado, sem confirmar pagamento. Order, Point, Envios e todos os tópicos desconhecidos recebem `200 ignored` e jamais são interpretados como pagamento.

Essa separação evita que uma notificação de produto não integrado seja enviada por engano à consulta de pagamento e cria uma barreira clara entre Checkout Pro atual e POS futuro.

## Evidências de validação

| Verificação | Resultado |
| --- | --- |
| Testes de roteamento de tópicos e respostas do Webhook | 6 testes focados aprovados. |
| Teste de tipos | Aprovado. |
| Suíte Vitest completa | 103 testes em 29 arquivos aprovados. |
| Build Next.js de produção | Aprovado; a rota de Webhook foi compilada. |

## Referências

[1]: https://www.mercadopago.com.br/developers/en/docs/your-integrations/notifications "Mercado Pago — Notifications"
[2]: https://www.mercadopago.com.mx/developers/en/docs/checkout-pro/additional-content/notifications/webhooks "Mercado Pago — Checkout Pro Webhooks"
[3]: https://www.mercadopago.com.br/developers/en/docs/security/oauth "Mercado Pago — OAuth"
[4]: https://www.mercadopago.com.co/developers/en/docs/application-details "Mercado Pago — Application details"
[5]: https://www.mercadopago.com.ar/developers/en/docs/mp-point/notifications "Mercado Pago Point — Configure notifications"
[6]: https://www.mercadopago.com.mx/developers/en/docs/mp-point/overview "Mercado Pago Point — Overview"
