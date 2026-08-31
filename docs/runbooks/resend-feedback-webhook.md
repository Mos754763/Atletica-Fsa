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

## Feedback que chega enquanto a mensagem está na fila

O worker reconsulta as suppressions ativas de cada destinatário imediatamente antes da chamada ao Resend, usando a prioridade persistida na outbox. Assim, o bloqueio recebido depois do enqueue ou entre itens do lote também é respeitado. O endereço é normalizado com `trim().toLowerCase()` nos dois pontos.

Quando o envio está bloqueado, o worker preserva a intenção com status `canceled`, libera `locked_at` e registra o motivo em `last_error`. Não chama o Resend nem cria uma entrega. O campo `processing.suppressed` contabiliza somente cancelamentos confirmados pelo banco. Falhas de consulta ou persistência impedem o envio e seguem a política de retry/dead letter existente.

Verificar em homologação isolada:

1. Enfileirar uma mensagem para um destinatário sintético ainda não bloqueado.
2. Registrar feedback assinado de bloqueio antes de processar a fila.
3. Processar a fila e confirmar `canceled`, motivo registrado e ausência de nova entrega no provedor.
4. Repetir com feedback chegando entre dois itens de um lote para o mesmo destinatário.

A regra local existente continua preservada: complaint bloqueia prioridades menores que 80; hard bounce e supressão do provedor bloqueiam todas. Essa exceção local para mensagens essenciais **não remove nem contorna** uma suppression mantida pelo Resend: o provedor pode impedir a entrega independentemente da prioridade ([documentação](https://resend.com/docs/dashboard/emails/email-suppressions)).

Limite: a consulta local e a chamada HTTP ao provedor não são uma transação única. Feedback que chegar depois da consulta final ainda pode coincidir com uma requisição em andamento. A validação unitária cobre a lógica do worker com banco/provedor simulados; não substitui testes reais de concorrência e de webhook em homologação.

## Rollback sem perda

1. Desabilitar apenas o webhook no painel do Resend.
2. Remover `RESEND_WEBHOOK_SECRET` somente após o webhook estar desabilitado.
3. Reverter a aplicação se necessário; as tabelas e eventos permanecem para auditoria.

Não apagar `email_webhook_events`, `email_suppressions` ou a outbox durante rollback. As colunas/tabelas novas são compatíveis com a versão anterior, portanto não exigem rollback destrutivo do banco.
