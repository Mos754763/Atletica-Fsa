# Ensaio controlado da outbox de e-mails — homologação

> **Objetivo.** Produzir evidência de que a outbox enfileira, reivindica, entrega e registra uma única mensagem sintética em homologação. Este ensaio não habilita pagamentos, não usa destinatários de membros e não deve ser executado em Production.

## Contrato e limites

O ensaio cobre a deduplicação por `dedupe_key`, o claim com exclusão mútua, a transição para `sent`, o registro em `email_deliveries` e a persistência do identificador do provedor. As regras de retry exponencial, falha terminal e concorrência também são cobertas pela suíte local `src/lib/email/transactional.test.ts`; elas **não** devem ser induzidas por destinatários inválidos em um provedor externo.

| Controle | Critério de aceite | Evidência esperada |
|---|---|---|
| Destinatário | Caixa externa exclusiva de teste, previamente autorizada e sem dados pessoais de membros. | Uma mensagem recebida com assunto sintético. |
| Isolamento | Nenhuma linha pendente ou em processamento fora da chave de teste; nenhum evento com lembrete iminente antes do acionamento. | Consulta de pré-flight arquivada sem conteúdo HTML ou dados de membros. |
| Deduplicação | Segunda inserção com a mesma chave falha por unicidade e não cria entrega adicional. | Uma linha na outbox e uma linha em `email_deliveries`. |
| Claim | O worker processa apenas a linha sintética de teste. | Estado final `sent`, `locked_at=null`, `provider_message_id` presente. |
| Segurança | `CRON_SECRET`, URL de banco e credenciais Resend não são exibidos, registrados ou enviados em tickets. | Comandos usam prompt silencioso e resultados sanitizados. |

## Pré-flight obrigatório

1. Confirmar no painel que `RESEND_API_KEY`, `EMAIL_FROM` e `CRON_SECRET` existem **somente por nome** em Preview/homologação.
2. Escolher um alias externo de teste autorizado, por exemplo `seu-alias+fsa-outbox@provedor.example`. Nunca use endereço de membro ou lista real.
3. Confirmar que `PAYMENTS_ENABLED=false` permanece em homologação e em Production.
4. Consultar o banco de homologação com uma conexão privilegiada, sem imprimir a URL ou senha:

```sql
select status, count(*)
from public.email_outbox
group by status
order by status;

select count(*) as lembretes_iminentes
from public.events
where starts_at >= now()
  and starts_at < now() + interval '2 days'
  and status = 'published';
```

O ensaio só continua se não houver outras linhas `pending`/`processing` e não houver evento publicado a menos de dois dias. Caso contrário, interrompa: o cron compartilhado poderia processar mensagens operacionais não sintéticas.

## Execução controlada

1. Gere uma chave única localmente, por exemplo `homolog-outbox-20260820-<sufixo-aleatorio>`.
2. Em uma transação no banco de **homologação**, insira somente uma mensagem sintética. Use um assunto identificável e HTML sem informações pessoais. Exemplo de formato, substituindo os marcadores localmente:

```sql
begin;
insert into public.email_outbox (
  dedupe_key, recipient_email, template_key, subject, html, priority
) values (
  '<CHAVE_UNICA>', '<EMAIL_DE_TESTE_AUTORIZADO>', 'event_reminder',
  '[HOMOLOG] Evidência controlada da outbox',
  '<p>Mensagem sintética de validação. Nenhuma ação é necessária.</p>', 100
);
commit;
```

3. Execute a rota cron **somente no preview/homologação** usando um terminal confiável. O comando deve solicitar o segredo sem exibi-lo:

```bash
read -r -s "CRON_SECRET do Preview: " CRON_SECRET; echo
curl -sS -w '\nHTTP_STATUS=%{http_code}\n' \
  --config <(printf 'header = "Authorization: Bearer %s"\n' "$CRON_SECRET") \
  'https://<URL_DO_PREVIEW>/api/cron/event-reminders'
unset CRON_SECRET
```

O resultado esperado é `HTTP_STATUS=200` com `processing.sent=1`. Se a resposta diferir, **não repita** a chamada antes de consultar o estado da outbox.

4. Confirme o estado sem recuperar `html`, corpo do e-mail ou dados de outros destinatários:

```sql
select id, dedupe_key, status, attempts, provider_message_id is not null as provider_confirmed,
       locked_at is null as unlocked, sent_at is not null as sent_at_recorded
from public.email_outbox
where dedupe_key = '<CHAVE_UNICA>';

select count(*) as entregas_registradas
from public.email_deliveries
where provider_message_id = (
  select provider_message_id
  from public.email_outbox
  where dedupe_key = '<CHAVE_UNICA>'
);
```

5. Confirme na caixa externa autorizada a chegada de uma única mensagem. Registre apenas data/hora, assunto e presença da mensagem — não encaminhe o conteúdo a logs ou tickets.

## Teste de idempotência e encerramento

Uma segunda inserção com a mesma `<CHAVE_UNICA>` deve falhar por restrição única. Essa falha é esperada e não deve ser convertida em retry:

```sql
insert into public.email_outbox (
  dedupe_key, recipient_email, template_key, subject, html, priority
) values (
  '<CHAVE_UNICA>', '<EMAIL_DE_TESTE_AUTORIZADO>', 'event_reminder',
  '[HOMOLOG] Duplicata deliberada', '<p>Não deve ser entregue.</p>', 100
);
```

Após registrar a violação esperada, não repita o cron. A evidência final deve demonstrar uma única linha de outbox e uma única entrega.

## Interrupção e rollback

Se a mensagem ainda estiver `pending` ou `processing` e o ensaio precisar ser cancelado, marque **somente a linha sintética** como `canceled` e registre o motivo. Nunca exclua evidências e nunca altere linhas não associadas à chave de teste.

```sql
update public.email_outbox
set status = 'canceled', locked_at = null, last_error = 'Ensaio de homologação cancelado de forma controlada.'
where dedupe_key = '<CHAVE_UNICA>'
  and status in ('pending', 'processing');
```

Uma mensagem já enviada não é revertível; nesse caso, apenas encerre o ensaio e arquive a evidência mínima.

## Critério para abrir execução real

Antes de executar o ensaio em homologação, a pull request deve conter: os contratos locais verdes, este runbook revisado, o resultado do pré-flight sem filas operacionais concorrentes e a confirmação explícita do endereço de teste autorizado. A execução deve permanecer bloqueada se qualquer item estiver ausente.

## Evidência local de preparação — 2026-08-20

O contrato dedicado `src/lib/email/transactional.test.ts` foi executado com sete cenários aprovados: enfileiramento determinístico, deduplicação, configuração ausente, entrega, retry exponencial, encerramento após a quinta falha e invariantes SQL de exclusão mútua. A validação completa do branch também concluiu `pnpm typecheck`, `pnpm test` (**152 aprovados**, 3 ignorados), `pnpm audit --prod` e `pnpm build` sem falhas conhecidas.

Essa evidência é exclusivamente local e simulada. Ela não substitui o pré-flight, a autorização do endereço sintético, a chamada autenticada em Preview/homologação, nem a confirmação de entrega externa exigidas por este runbook.
