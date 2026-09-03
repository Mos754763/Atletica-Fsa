# Feedback de entrega do Resend

## Estado seguro

A rota `POST /api/webhooks/resend` aceita somente corpo bruto assinado, limita o payload a 128 KiB e valida `svix-id`, `svix-timestamp` e `svix-signature` com tolerância de cinco minutos. O `svix-id` é persistido com unicidade porque o Resend entrega webhooks pelo menos uma vez e pode repetir o mesmo evento. A versão bloqueada do SDK (`resend` 4.8.0) não expõe a API `webhooks.verify`; por isso o verificador local implementa exatamente o contrato Svix (HMAC SHA-256 de `id.timestamp.raw-body`, segredo `whsec_` Base64 e uma ou mais assinaturas `v1`) sem adicionar uma dependência ou serviço pago.

O contrato atual do Resend mantém `data.email_id` e `data.to` em todos esses eventos. Embora `to` seja um array por compatibilidade, o Resend informa um único destinatário por evento; a aplicação também envia uma mensagem por requisição. O parser exige exatamente um destinatário antes de persistir `data.to[0]`. Se o emissor passar a enviar vários destinatários na mesma requisição, este contrato deve ser reavaliado antes de promover a rota.

Esta mudança não cria nem ativa webhook automaticamente. A migration é aditiva, a aplicação anterior continua funcionando após sua aplicação e nenhum recebimento/MX é necessário para feedback de e-mails enviados. O escopo são eventos de feedback dos e-mails enviados e `email.suppressed`; `suppression.added` e `suppression.removed` não são sincronizados nesta PR. Reativar/remover uma suppression exige um fluxo futuro ou ação manual autorizada.

## Estado dos ledgers e próxima aplicação

- Homologação registra o ledger consolidado histórico `20260831054257_harden_email_delivery_and_resend_feedback`.
- Production registra somente `20260903160930_harden_email_outbox_delivery` (PR #39).
- O delta atual da PR #40 é exclusivamente `20260903170000_resend_feedback_and_suppressions.sql`, posterior ao ledger de Production. Não execute `supabase db push`, não marque migrations antigas como aplicadas e não aplique nomes antigos para tentar alinhar histórico.
- Antes de qualquer aplicação, comparar formalmente schema, grants, RLS, funções e ledger do alvo com a migration candidata. Em Production, após essa comparação e uma autorização específica, aplicar somente `20260903170000_resend_feedback_and_suppressions.sql`.

O artefato histórico aplicado em homologação tinha os hashes abaixo, inclusive o arquivo `20260830000456` da #39 e o então nomeado `20260830010456` da #40. Eles documentam a execução de 2026-08-31; diferem dos arquivos corrigidos depois do merge/rebase por serem artefatos históricos, não uma indicação de drift silencioso. O histórico não deve ser reescrito nem “corrigido” por marcação manual.

## Ordem de implantação sem indisponibilidade

1. Depois da comparação formal, aplicar somente a migration candidata apropriada ao alvo; para Production é `20260903170000_resend_feedback_and_suppressions.sql`.
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
- `email.bounced` e `email.suppressed` cancelam qualquer novo envio para o endereço; o Resend define `email.bounced` como rejeição permanente, por isso a regra é uma suppression `hard_bounce`;
- evento recebido antes da finalização da outbox fica `unmatched` e é reconciliado quando a entrega é gravada;
- um evento antigo não rebaixa complaint/bounce para delivered.

## Validação SQL sem envio

Executar `supabase/tests/email_feedback.sql` somente em homologação isolada, depois da comparação formal e da migration candidata. O teste usa destinatários `example.invalid`, não chama o provedor nem processa a fila existente e termina com `ROLLBACK`, removendo suas fixtures. Requer uma conexão administrativa capaz de `SET ROLE` e um perfil presidente existente para testar leitura autorizada; não cria nem promove usuários.

A suíte verifica idempotência, eventos antecipados/fora de ordem, três motivos de suppression, RLS para usuário comum/presidente, privilégios das RPCs e colisão de `provider_message_id`. Uma colisão deve gerar `unique_violation` e manter a segunda outbox em `processing`, sem sucesso silencioso.

Ingestão e finalização adquirem o mesmo advisory lock transacional por ID do provedor, antes das escritas. Isso serializa as duas operações no isolamento padrão `READ COMMITTED` e permite que a reconciliação veja o commit anterior. Use uma RPC por transação; consumidores com isolamento mais forte precisam tratar retry de serialização. O teste sequencial SQL não prova concorrência entre conexões; essa verificação exige sessões independentes.

### Execução de homologação — 2026-08-31

- Alvo autorizado: Supabase `gfnbdjdqumewspvfxicl`, associado pelo responsável ao ambiente Vercel Preview. Nenhuma alteração em Production.
- Foram aplicados dois artefatos históricos juntos, em transação, com `lock_timeout = '2s'` e `statement_timeout = '20s'`. O histórico remoto registrou `20260831054257_harden_email_delivery_and_resend_feedback`.
- Hashes dos artefatos históricos aplicados (SHA-256), preservados somente para auditoria:
  - `20260830000456_harden_email_outbox_delivery.sql`: `3c99157696bb444224db540e2ee971c2c0414f9f28761dfa7d49e088da7677b3`.
  - `20260830010456_resend_feedback_and_suppressions.sql`: `ce057e1335f7cf8cc105dfd73991a594a33b732acd278ad51f3dc3863bb60c8b`.
- A suíte SQL passou antes da persistência (incluindo DDL revertido) e novamente depois da aplicação. As fixtures foram revertidas em ambas as execuções.
- 27 testes locais passaram: 20 do worker, 3 da assinatura e 4 de contrato da migration. Os testes de contrato não substituem a suíte SQL.
- A fila preexistente permaneceu com 1 registro, com fingerprint idêntico antes/depois; entregas, eventos e suppressions permaneceram vazios. Nenhum worker foi disparado, nenhum e-mail enviado e nenhum webhook ativado.
- Advisors de segurança: os mesmos 60 avisos preexistentes, sem novos avisos por `cache_key`. Isso não significa ausência de dívida de segurança; os avisos existentes continuam exigindo análise separada ([referência](https://supabase.com/docs/guides/database/database-linter)).
- Concorrência entre conexões: **inconclusiva** nesta execução. Não foi possível observar uma sessão mantendo o lock enquanto a outra consultava pelo conector. Não considerar o teste de corrida entre webhook e finalização aprovado; repetir com duas conexões independentes antes de produção.

O histórico remoto estava vazio antes desta aplicação, apesar do schema já existente. A entrada consolidada acima não equivale ao alinhamento de todo o histórico com os nomes locais. Não automatizar `db push`, nem marcar migrations antigas como aplicadas: comparar o baseline e o schema antes de cada aplicação. O webhook HTTP assinado e o fluxo completo no Preview continuam como gates de homologação.

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
