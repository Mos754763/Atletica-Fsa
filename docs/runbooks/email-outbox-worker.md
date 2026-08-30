# Worker frequente da outbox de e-mails

## Objetivo e estado seguro

A rota `/api/cron/email-outbox` processa até 50 mensagens por execução, usa `CRON_SECRET`, preserva a fila quando o Resend não está configurado e registra heartbeat. Ela não fica ativa apenas por ser publicada: o `vercel.json` já agenda diariamente `/api/cron/event-reminders`, e essa rota chama `processEmailOutbox` como fallback diário. A rota frequente autenticada só recebe chamadas depois de um agendamento separado e aprovado.

O plano Vercel Hobby aceita cron somente uma vez ao dia. Não adicione `*/10 * * * *` ao `vercel.json`: essa configuração reprova o deployment. A cadência de dez minutos deve ser ativada pelo Supabase Cron somente após o Preview, a migration e a rota candidata estarem validados.

## Ordem obrigatória para Production

Não publique o código antes do contrato de banco estar presente.

1. Executar o gate de agregados de duplicidade/readiness revisado, sem expor destinatários, e confirmar que não existem grupos duplicados não nulos por `provider_message_id`.
2. Aplicar a migration revisada `20260830000456_harden_email_outbox_delivery.sql`.
3. Verificar coluna, FK, os dois índices parciais únicos, função, `SECURITY DEFINER`, `search_path=''` e ACL exclusiva de `service_role`; em ambiente gravável autorizado, comprovar que uma colisão de `provider_message_id` reverte a segunda outbox para `processing`.
4. Só então fazer merge/deploy do código candidato. Confirmar que `RESEND_API_KEY`, `EMAIL_FROM` e `CRON_SECRET` existem no ambiente correto verificando apenas seus nomes, e que o domínio de envio está verificado. O recebimento/MX não é requisito.
5. Manter o cron diário `/api/cron/event-reminders` como fallback. Ativar o scheduler frequente somente depois de Preview e observação saudável.

Resultado ambíguo do Resend (falha de transporte, resposta sem ID, HTTP 408/409 ou 5xx) não recebe retry automático: a outbox vai imediatamente para `failed`/dead-letter com o erro preservado para reconciliação manual. Isso evita extrapolar a janela de idempotência de 24 horas das chaves do Resend. Falhas definidas continuam sujeitas ao backoff limitado.

## Ativação no Supabase

Após a ordem de Production acima e somente em uma aprovação separada, habilite `pg_cron` e `pg_net` no ambiente de homologação. Esta ativação deve permanecer zero-cost-only. Grave no Vault, pelo painel e sem copiar valores para SQL versionado:

- `email_outbox_worker_url`: URL absoluta da rota candidata;
- `email_outbox_cron_secret`: o mesmo segredo aceito pela rota naquele ambiente.

Depois confirme somente a existência dos nomes, nunca os valores:

```sql
select name
from vault.decrypted_secrets
where name in ('email_outbox_worker_url', 'email_outbox_cron_secret')
order by name;
```

Agende a chamada autenticada a cada dez minutos:

```sql
select cron.schedule(
  'email-outbox-worker-v1',
  '*/10 * * * *',
  $job$
    select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'email_outbox_worker_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'email_outbox_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $job$
);
```

O nome do job é estável; repetir `cron.schedule` com o mesmo nome substitui a definição existente.

## Verificação

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'email-outbox-worker-v1';

select status, count(*)
from public.email_outbox
group by status
order by status;

select route_path, status, executed_at, duration_ms, detail
from public.scheduled_route_heartbeats
where route_path = '/api/cron/email-outbox'
order by executed_at desc
limit 12;
```

Critérios: heartbeat pelo menos a cada 20 minutos, nenhuma mensagem com mais de dez minutos sem tentativa durante operação normal, nenhuma duplicata por `outbox_id` ou `provider_message_id`, e retry de falhas definidas mantendo a mesma chave idempotente no Resend. Resultados ambíguos são reconciliados manualmente, nunca reenviados automaticamente.

## Interrupção e rollback sem perda

Pausar o worker não exclui nem cancela mensagens:

```sql
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'email-outbox-worker-v1'),
  active := false
);
```

Reative apenas após corrigir a causa. Nunca apague a outbox para aliviar backlog. Durante o rollback, o cron diário de lembretes permanece como fallback e as intenções novas continuam sendo persistidas mesmo se o Resend estiver temporariamente sem configuração.
