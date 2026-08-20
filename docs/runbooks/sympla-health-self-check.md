# Runbook — correção de autoavaliação do health check Sympla

## Contrato corrigido

A rota `/api/cron/integration-health` avalia a cadência das rotas monitoradas, incluindo a própria rota semanal. Para evitar que a execução corrente seja usada como evidência de sua própria saúde, a coleta considera apenas heartbeats com `executed_at` estritamente anterior ao instante em que a avaliação começou.

> O estado da execução atual é registrado apenas ao final, como `succeeded` ou `failed`. Ele serve à próxima avaliação, nunca à avaliação em andamento.

## Invariantes verificáveis

| Invariante | Implementação | Teste de regressão |
|---|---|---|
| Não autoaprovar a execução corrente | Filtro de banco `executed_at < startedAt` e filtro defensivo em memória. | Heartbeat no instante de início é ignorado. |
| Não aceitar evento futuro ou retry concorrente | Mesmo filtro estrito descarta tempos posteriores. | Heartbeat posterior ao início é ignorado. |
| Preservar a última execução anterior | Mapa mantém o maior `executedAt` elegível por rota. | Heartbeat semanal da rodada anterior permanece selecionado. |
| Não esconder falhas reais | A classificação continua recebendo o status do último heartbeat anterior. | Os testes existentes preservam cenários ausente, falho, warning e crítico. |

## Validação de homologação

1. Aplicar o branch em preview de homologação sem alterar produção.
2. Acionar a rota autenticada uma vez e observar que o heartbeat é inserido somente ao encerramento da execução.
3. Na execução seguinte, verificar que a consulta usa exclusivamente registros anteriores ao novo início.
4. Confirmar que a resposta, `integration_health_states` e alertas refletem o último estado anterior, sem classificação artificialmente saudável da rodada em curso.
5. Registrar apenas resultados sanitizados; não incluir segredos de cron, URLs de banco ou tokens em logs, commits ou PRs.

O cron mantém a cadência definida em `vercel.json`; esta correção não cria timers no processo e não altera a agenda, os limites de alerta ou o fluxo de Slack.
