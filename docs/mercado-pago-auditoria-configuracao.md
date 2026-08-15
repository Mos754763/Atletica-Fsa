# Auditoria de Eventos, Permissões e Webhooks — Mercado Pago

**Projeto:** ATLETICA FSA  
**Atualizado em:** 14 de agosto de 2026  
**Responsável técnico:** Manus AI

## Decisão operacional

A ATLETICA FSA já possui uma integração de **Checkout Pro** para vendas na loja e ingressos pagos. A preferência é criada exclusivamente no servidor, com itens, preços e referências externas obtidos do banco; a confirmação do pagamento ocorre somente após Webhook assinado, consulta direta ao provedor, validação de valor e liquidação idempotente de estoque ou ingresso.

> **Regra de lançamento:** mantenha `PAYMENTS_ENABLED=false` em Production e Preview durante toda a configuração e homologação. Esse bloqueio impede a criação de novos checkouts e a conciliação comercial efetiva no código atual.

Mercado Pago recomenda Webhooks em vez de IPN, pois os Webhooks fornecem assinatura secreta para validação da origem. Os tópicos dependem do produto integrado; habilitar tópicos sem um consumidor validado gera notificações desnecessárias e amplia a superfície operacional. [1]

## O que configurar agora

Na aplicação Mercado Pago utilizada pelo projeto, abra **Webhooks → Configurar notificações**. Cadastre a mesma URL nos ambientes que estiver homologando, usando URLs separadas quando o painel permitir:

| Ambiente | URL | Eventos a habilitar agora | Resultado esperado |
| --- | --- | --- | --- |
| Teste / homologação | URL pública de Preview que corresponda ao commit em teste | **Pagamentos** | Receber a notificação de Checkout Pro em ambiente de teste; o gate interno ainda responde `503` enquanto pagamentos estiverem bloqueados. |
| Produção | `https://atletica-fsa.vercel.app/api/payments/mercado-pago/webhook` | **Pagamentos** | Preparar o endereço produtivo para a futura liberação após homologação completa. |

Depois de salvar, copie o **segredo de assinatura gerado pelo painel** para a variável server-side `MERCADO_PAGO_WEBHOOK_SECRET`. Ele não deve ser exposto no navegador, no GitHub, em imagens ou mensagens. A assinatura recebida no cabeçalho `x-signature` é conferida por HMAC SHA-256, com `x-request-id`, `data.id` e janela de cinco minutos contra replay.

## Matriz de opções do painel

| Opção exibida no painel | Tópico/documentação | Situação no código | Decisão atual | Ação no painel |
| --- | --- | --- | --- | --- |
| **Pagamentos** | `payment` | **Implementado.** Webhook consulta o pagamento, valida referência e valor, grava pagamento e liquida pedido/ingresso de modo idempotente. | Necessário para Checkout Pro. | **Habilitar agora** no ambiente que estiver sendo homologado. |
| **Pedidos comerciais** | `merchant_order` | Rota reconhece, exige assinatura e grava o evento como `ignored` com o motivo `merchant_order_not_enabled`; não muda estado financeiro. | Redundante para a conciliação atual, que usa o pagamento como fonte de verdade. | **Não habilitar.** Só reavaliar se houver necessidade real de acompanhar o ciclo comercial do Mercado Pago além do pagamento. |
| **Order (Mercado Pago)** | `order` / `orders` | Preparado para identificação e validação da grafia, mas **sem endpoint Point ativo**. A rota retorna `503` com `point_not_implemented` após a abertura do gate. | Necessário quando a integração Point por Orders API estiver implementada e homologada. | **Não habilitar ainda.** |
| **Integrações Point** | `point_integration` | Reconhecido e bloqueado como Point não homologado. Este tópico se relaciona ao modelo Point legado. | Não é necessário para Checkout Pro; a estratégia futura prioriza Orders API. | **Não habilitar.** |
| **Planos e assinaturas** | `subscription_*` | Não implementado. | Não há cobrança recorrente no escopo atual. | **Não habilitar.** |
| **Application linking / Mercado Pago Connect** | `mp-connect` | Não implementado. | Apenas necessário se a plataforma operar em nome de múltiplos vendedores via OAuth. | **Não habilitar.** |
| **Wallet Connect** | `wallet_connect` | Não implementado. | Não faz parte da operação da ATLETICA FSA. | **Não habilitar.** |
| **Alertas de fraude** | `stop_delivery_op_wh` / cancelamento de entrega | Não implementado. | Pode ser relevante em uma evolução de antifraude para entregas, mas não deve mudar estoque ou entrega sem fluxo revisado. | **Manter desabilitado; reavaliar em fase de logística.** |
| **Reclamações** | `topic_claims_integration_wh` | Não implementado. | Útil futuramente para atendimento financeiro, mas requer triagem, responsável e SLA. | **Manter desabilitado; planejar antes de ativar.** |
| **Atualização de cartão** | `topic_card_id_wh` | Não implementado. | Não há armazenamento de cartão nem cobrança recorrente. | **Não habilitar.** |
| **Chargebacks** | `topic_chargebacks_wh` | Não implementado. | Relevante para uma futura rotina de conciliação e evidências, mas não altera automaticamente pedidos ou estoque. | **Manter desabilitado até existir o fluxo financeiro de tratamento.** |

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
6. Somente então habilitar **Order (Mercado Pago)** e simular todos os estados no painel do Mercado Pago antes de liberar `PAYMENTS_ENABLED=true`.

## Alteração interna entregue nesta auditoria

O webhook passou a classificar notificações por tópico antes de iniciar a conciliação. Eventos `payment` preservam o fluxo existente. Eventos `merchant_order` agora são validados e registrados como ignorados, sem confirmar pagamento. Eventos Point (`order`, `orders` e `point_integration`) são recusados explicitamente enquanto a operação não estiver homologada; eventos desconhecidos recebem resposta segura de ignorado e jamais são interpretados como pagamento.

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
