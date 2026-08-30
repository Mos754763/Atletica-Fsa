# Feedback de entrega do Resend

## Estado seguro

A rota `POST /api/webhooks/resend` aceita somente corpo bruto assinado, limita o payload a 128 KiB e valida `svix-id`, `svix-timestamp` e `svix-signature` com tolerância de cinco minutos. O `svix-id` é persistido com unicidade porque o Resend entrega webhooks pelo menos uma vez e pode repetir o mesmo evento.

Esta mudança não cria nem ativa webhook automaticamente. A migration é aditiva, a aplicação anterior continua funcionando após sua aplicação e nenhum recebimento/MX é necessário para feedback de e-mails enviados.

## Ordem de implantação sem indisponibilidade

1. Aplicar `20260830000456_harden_email_outbox_delivery.sql` e depois `20260830010456_resend_feedback_and_suppressions.sql` no banco isolado de homologação.
2. Configurar `RESEND_WEBHOOK_SECRET` apenas no ambiente candidato, sem registrar seu valor em código, log ou ticket.
3. Implantar a rota candidata e confirmar que uma chamada sem assinatura retorna `400`, assinatura inválida retorna `401` e ausência do segredo retorna `503`.
4. Criar no Resend um webhook separado para homologação com os eventos `email.delivered`, `email.bounced`, `email.complained`, `email.failed` e `email.suppressed`.
5. Executar eventos sintéticos autorizados e confirmar idempotência, status de entrega e suppression.
6. Repetir a sequência migration → variável → deploy → webhook no ambiente final. Nunca aponte o webhook para uma rota ainda não implantada.

Se o Preview da Vercel estiver protegido, use uma homologação acessível ao Resend. Não desative a proteção global de Production para testar esta rota.

## Critérios de aceite

```sql
select event_type, status, count(*)
from public.email_webhook_events
group by event_type, status
order by event_type, status;

select delivery_status, count(*)
from public.email_deliveries
group by delivery_status
order by delivery_status;

select reason, count(*)
from public.email_suppressions
where active
group by reason
order by reason;
```

- reenviar o mesmo evento mantém uma única linha pelo par `(provider, event_id)`;
- `email.complained` cancela novas comunicações com prioridade menor que 80, preservando a intenção na outbox;
- `email.bounced` e `email.suppressed` cancelam qualquer novo envio para o endereço;
- evento recebido antes da finalização da outbox fica `unmatched` e é reconciliado quando a entrega é gravada;
- um evento antigo não rebaixa complaint/bounce para delivered.

## Rollback sem perda

1. Desabilitar apenas o webhook no painel do Resend.
2. Remover `RESEND_WEBHOOK_SECRET` somente após o webhook estar desabilitado.
3. Reverter a aplicação se necessário; as tabelas e eventos permanecem para auditoria.

Não apagar `email_webhook_events`, `email_suppressions` ou a outbox durante rollback. As colunas/tabelas novas são compatíveis com a versão anterior, portanto não exigem rollback destrutivo do banco.
