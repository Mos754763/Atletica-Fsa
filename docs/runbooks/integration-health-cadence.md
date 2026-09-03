# Cadência do integration health

## Contrato ativo

A rota `/api/cron/integration-health` verifica as integrações e os heartbeats das rotas diárias. A única agenda ativa é a Vercel, em `0 18 * * *` (diariamente às 18:00 UTC).

O health check usa a mesma janela de 1.560 minutos (26 horas) das demais rotas diárias. Isso tolera o intervalo normal entre duas execuções diárias e um pequeno atraso operacional: a pré-alerta ocorre após 75% da janela e o estado só é crítico depois de 26 horas sem heartbeat bem-sucedido.

Não há agendador de duas horas, extensão, cron, segredo ou configuração adicional de banco ativados por este contrato. Um eventual rollout para uma frequência maior precisa alterar, na mesma entrega planejada, o agendamento efetivamente ativo, o limiar, os testes e este runbook; até lá, a resposta da rota informa `cadence: "daily"`.

## Verificação

1. Confirme no `vercel.json` que a rota usa exatamente `0 18 * * *`.
2. Após o deployment, confira o último heartbeat de `/api/cron/integration-health` nos registros operacionais autorizados.
3. Interprete um heartbeat do dia anterior dentro da janela diária como `healthy` ou `warning`, nunca como `critical` apenas por não haver execução a cada duas horas.
4. Mantenha a chamada protegida pelo mesmo `CRON_SECRET` e cabeçalho `Bearer`; não registre esses valores em logs, commits ou PRs.

## Rollback

Se for necessário reverter esta mudança, reverta juntos a cadência anunciada e seu limiar. Não crie um segundo agendador como medida de rollback e não remova heartbeats ou estados de incidente, pois eles são a trilha de auditoria e a base da deduplicação de alertas.
