# Cadência do integration health

## Contrato ativo

A rota `/api/cron/integration-health` verifica as integrações e os heartbeats das rotas diárias. A única agenda ativa é a Vercel, em `0 18 * * *` (diariamente às 18:00 UTC).

O health check usa uma janela própria de 2.160 minutos (36 horas). Isso mantém saudável o heartbeat anterior no disparo diário normal: a pré-alerta ocorre depois de 27 horas e o estado só é crítico depois de 36 horas sem heartbeat bem-sucedido. As demais rotas diárias mantêm sua janela de 1.560 minutos (26 horas).

Não há agendador de duas horas, extensão, cron, segredo ou configuração adicional de banco ativados por este contrato. Um eventual rollout para uma frequência maior precisa alterar, na mesma entrega planejada, o agendamento efetivamente ativo, o limiar, os testes e este runbook; até lá, a resposta da rota informa `cadence: "daily"`.

## Verificação

1. Confirme no `vercel.json` que a rota usa exatamente `0 18 * * *`.
2. Após o deployment, confira o último heartbeat de `/api/cron/integration-health` nos registros operacionais autorizados.
3. No disparo diário normal, interprete o heartbeat do dia anterior como `healthy`; após 27 horas ele passa a `warning` e depois de 36 horas a `critical`.
4. Mantenha a chamada protegida pelo mesmo `CRON_SECRET` e cabeçalho `Bearer`; não registre esses valores em logs, commits ou PRs.

## Rollback

Se for necessário reverter esta mudança, reverta juntos a cadência anunciada e seu limiar. Não crie um segundo agendador como medida de rollback e não remova heartbeats ou estados de incidente, pois eles são a trilha de auditoria e a base da deduplicação de alertas.
