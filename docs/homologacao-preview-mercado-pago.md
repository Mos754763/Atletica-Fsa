# Homologação — Mercado Pago no Preview

**Projeto Supabase isolado:** `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`)
**Preview validado:** `https://atletica-g9ueq84fp-moises-faustino-rodrigues-s-projects.vercel.app/`
**Regra permanente:** `PAYMENTS_ENABLED=false` em **Production**.

Em 17 de agosto de 2026, as migrations estruturais foram aplicadas exclusivamente na homologação. O banco ficou com 43 tabelas públicas e sem dados de produção: `profiles`, `orders` e `payment_webhook_events` começaram com zero registros. A migration de bootstrap do presidente continua pendente porque exige criar primeiro uma conta proprietária exclusiva desse ambiente; nenhuma conta ou dado de produção foi copiado.

## Configuração confirmada

| Variável | Production | Preview de homologação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Projeto produtivo, inalterado | `https://gfnbdjdqumewspvfxicl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave produtiva, inalterada | Chave publishable da homologação |
| `SUPABASE_SECRET_KEY` | Chave produtiva, inalterada | Chave server-only da homologação |
| `MERCADO_PAGO_ACCESS_TOKEN` | Sandbox, com gate fechado | Sandbox, disponível para ensaio |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Entrada preservada | Segredo sandbox em entrada Preview própria |
| `PAYMENTS_ENABLED` | `false` explícito | `true` para teste isolado |
| `NEXT_PUBLIC_APP_URL` | URL produtiva | Deve apontar para a URL do Preview usada em cada ensaio |

Nenhum segredo é gravado em código, documentação ou commit. O Preview continua protegido por autenticação Vercel; quando um teste automatizado precisa alcançá-lo, um bypass de automação pode ser criado temporariamente, usado em memória e revogado imediatamente.

## Evidência de repetição do webhook

O Preview foi redeployado com as variáveis isoladas e completou o build com estado **Ready**. Um tópico sandbox `merchant_order`, acompanhado de assinatura HMAC SHA-256 válida, foi enviado duas vezes com o mesmo identificador. A primeira notificação retornou HTTP 200 com `merchant_order_not_enabled`; a segunda retornou HTTP 200 com `duplicate: true`. No banco de homologação, foi gravada somente uma linha `ignored` em `payment_webhook_events`, sem pagamentos ou movimentos de estoque.

Esse cenário valida a deduplicação persistente e a proteção contra replay na rota exposta. A validação de liquidação completa — um pagamento sandbox aprovado levando a exatamente um pagamento, uma baixa de estoque e um e-mail — ainda requer criar produto, pedido e pagador exclusivamente na homologação.

## Script reproduzível

Use o script abaixo apenas com segredos fornecidos em memória e um bypass temporário ativo:

```bash
MERCADO_PAGO_WEBHOOK_SECRET='…' \
VERCEL_PROTECTION_BYPASS_SECRET='…' \
./scripts/test-preview-webhook-idempotency.sh \
  https://seu-preview.vercel.app
```

O script não contém tokens e falha se a primeira chamada não for ignorada ou se a segunda não for marcada como duplicada.
