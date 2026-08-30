# Cadência do integration health

## Objetivo e fallback

A rota `/api/cron/integration-health` verifica integrações e os heartbeats das rotas diárias. A Vercel Hobby executa essa rota diariamente às 18:00 UTC como fallback. A cadência operacional de duas horas deve ser ativada pelo Supabase Cron apenas depois de a rota candidata e o segredo estarem validados.

Essa combinação evita uma expressão subdiária incompatível com o plano Vercel e mantém um segundo agendador independente. Nenhuma rota existente é suspensa ou substituída durante o rollout.

## Ativação em homologação

Habilite `pg_cron` e `pg_net` somente no banco isolado. Grave no Vault, sem copiar valores para SQL versionado:

- `integration_health_url`: URL absoluta de `/api/cron/integration-health` no ambiente candidato;
- `integration_health_cron_secret`: o `CRON_SECRET` do mesmo ambiente.

```sql
select cron.schedule(
  'integration-health-v1',
  '0 */2 * * *',
  $job$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'integration_health_url'),
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'integration_health_cron_secret')
      ),
      timeout_milliseconds := 30000
    );
  $job$
);
```

O objetivo de serviço é: ausência de uma rota diária deve produzir alerta em **≤ 2 horas** após ultrapassar sua janela de 1.560 minutos. O próprio health check fica crítico após 180 minutos sem heartbeat; o fallback diário da Vercel permanece para detectar falha do agendador Supabase.

## Verificação

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'integration-health-v1';

select route_path, status, executed_at, duration_ms, detail
from public.scheduled_route_heartbeats
where route_path = '/api/cron/integration-health'
order by executed_at desc
limit 24;
```

Critérios: pelo menos um heartbeat a cada 150 minutos em operação normal, dedupe de alertas durante o mesmo incidente e alerta de recuperação ao voltar para `healthy`.

## Rollback sem indisponibilidade

Pause somente o job frequente; o cron diário da Vercel continua ativo:

```sql
select cron.alter_job(
  job_id := (select jobid from cron.job where jobname = 'integration-health-v1'),
  active := false
);
```

Não remova heartbeats ou estados de incidente durante rollback. Reativar o job com o mesmo nome preserva a trilha e a deduplicação existentes.
