# Testes de Resiliência — Mercado Pago Point

**Autor:** Manus AI  
**Escopo:** preparação da integração Point; nenhuma cobrança, terminal ou credencial real é usada por esta suíte.

## Objetivo

Esta cobertura transforma as garantias da especificação Point em testes determinísticos executados no Node.js. O foco é impedir duplicidade de cobrança e de baixa de estoque, rejeitar notificações inseguras e encaminhar divergências para reconciliação em vez de tentar corrigir automaticamente um valor financeiro.

O comando focal é:

```bash
pnpm test:point-resilience
```

Para verificar também a lógica atualmente compartilhada com o Checkout Pro, execute:

```bash
pnpm typecheck && pnpm vitest run src/lib/payments/mercado-pago.test.ts src/lib/payments/point-resilience.test.ts
```

## Casos cobertos automaticamente

| ID | Cenário | Resultado seguro esperado |
|---|---|---|
| POS-01 | O caixa reenvia a mesma solicitação com a mesma `idempotency_key`. | A chamada ao provedor ocorre uma única vez; a tentativa original é devolvida. |
| POS-02 | Uma `idempotency_key` é reutilizada com valor ou pedido diferente. | A operação é recusada com `idempotency_conflict`. |
| POS-03 | Dois operadores iniciam tentativas distintas para o mesmo pedido. | A segunda operação é bloqueada por `open_attempt`. |
| POS-04 | Há timeout ou erro de rede depois de iniciar a criação da order no provedor. | A tentativa fica em `reconciliation_required`; não se cria nova cobrança automaticamente. |
| POS-05 | Uma notificação `order.processed` válida chega para a tentativa conhecida. | O pagamento é confirmado e a liquidação é aplicada uma única vez. |
| POS-06 | O mesmo webhook é reenviado. | É marcado como duplicado; não há nova baixa de estoque ou pagamento. |
| POS-07 | A mesma confirmação chega com novo `request-id`/versão. | A tentativa já liquidada permanece sem nova liquidação. |
| POS-08 | A assinatura HMAC é alterada, ausente ou inválida. | O webhook é recusado antes de alterar tentativa, pagamento ou estoque. |
| POS-09 | O timestamp da assinatura excede a janela de aceitação. | O evento é recusado como potencial replay. |
| POS-10 | `external_reference` ou valor recebido diverge do pedido local. | A tentativa é enviada a `reconciliation_required`; o estoque não é liquidado. |
| POS-11 | O terminal exige ação, falha ou expira. | O estado é registrado sem confirmação financeira ou baixa de estoque. |
| POS-12 | O webhook referencia uma order desconhecida localmente. | O processamento é interrompido sem mutação financeira. |

## O que a suíte simula

O arquivo `src/lib/payments/point-resilience.ts` contém um *harness* em memória. Ele não substitui a migration PostgreSQL nem o endpoint de produção; ele representa as invariantes que ambos devem preservar. Dessa forma, os testes são rápidos, repetíveis e não dependem de credenciais, terminal físico ou de disponibilidade do Mercado Pago.

O *harness* representa a reserva da tentativa, o vínculo da order remota, a deduplicação semântica de eventos e uma contagem de liquidações. Essa contagem equivale, no endpoint de produção, à chamada única para `settle_paid_order_inventory` após a validação do evento.

## Homologação ainda obrigatória

Os testes locais não confirmam conectividade, cadastro de terminal, aceitação de cartão, regras antifraude ou payloads emitidos por uma conta Point específica. Antes da liberação comercial, a equipe deve executar a matriz abaixo em sandbox e depois em um terminal físico autorizado.

| Ambiente | Teste de homologação | Evidência mínima |
|---|---|---|
| Sandbox | Criar order com `X-Idempotency-Key`, confirmar notificação e consultar a order. | IDs de request/order, assinatura validada e uma linha de auditoria. |
| Sandbox | Simular reenvio de webhook e falha transitória de consulta. | Um único pagamento/baixa e tentativa em reconciliação quando cabível. |
| Terminal físico | Enviar order a um Point vinculado, cancelar e executar um pagamento aprovado. | Registro de terminal, order e pagamento conciliados. |
| Produção controlada | Repetir a cobrança com a mesma chave após perda de rede. | Nenhuma cobrança duplicada e logs correlacionados. |

> A chave de idempotência deve ser enviada em toda criação de order. As notificações devem ser tratadas como sinal para validar a order/pagamento no servidor, não como fonte confiável isolada de valor ou status. [1] [2]

## Limites operacionais

O bloqueio `PAYMENTS_ENABLED=false` deve continuar ativo enquanto a migration, o endpoint de produção, as políticas RLS e a homologação não forem aprovados. Eventos com assinatura inválida, valor divergente ou referência desconhecida não devem ser “corrigidos” por retentativa automática; devem ser rastreados com correlação de IDs e encaminhados para reconciliação humana.

## Referências

[1]: https://www.mercadopago.com.br/developers/en/docs/mp-point/payment-processing "Mercado Pago Point — Processamento de pagamentos"
[2]: https://www.mercadopago.com.br/developers/en/docs/mp-point/notifications "Mercado Pago Point — Notificações"
