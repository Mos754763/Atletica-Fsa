# Runbook — correção de autoavaliação do health check Sympla

## Contrato corrigido

A rota `/api/cron/integration-health` avalia a cadência das rotas monitoradas, incluindo a própria rota diária da Vercel. A cadência ativa e o limiar correspondente são revisados juntos em qualquer rollout futuro; não são uma premissa semanal imutável. Para evitar que a execução corrente seja usada como evidência de sua própria saúde, a coleta considera apenas heartbeats com `executed_at` estritamente anterior ao instante em que a avaliação começou.

> O estado da execução atual é registrado apenas ao final, como `succeeded` ou `failed`. Ele serve à próxima avaliação, nunca à avaliação em andamento.

## Invariantes verificáveis

| Invariante | Implementação | Teste de regressão |
|---|---|---|
| Não autoaprovar a execução corrente | Filtro de banco `executed_at < startedAt` e filtro defensivo em memória. | Heartbeat no instante de início é ignorado. |
| Não aceitar evento futuro ou retry concorrente | Mesmo filtro estrito descarta tempos posteriores. | Heartbeat posterior ao início é ignorado. |
| Preservar a última execução anterior | Mapa mantém o maior `executedAt` elegível por rota. | Heartbeat diário da rodada anterior permanece selecionado. |
| Não esconder falhas reais | A classificação continua recebendo o status do último heartbeat anterior. | Os testes existentes preservam cenários ausente, falho, warning e crítico. |
| Escalar e recuperar health da Sympla | Métricas de dead letters classificam o incidente e `shouldSendRecovery` exige estado anterior não saudável. | Fixture de pico crítico seguida de métricas saudáveis; não há recuperação para estado já saudável. |
| Não duplicar alerta do mesmo incidente | Chave de deduplicação inclui integração, tipo de alerta e início do incidente. | A mesma entrada gera a mesma chave; tipo, integração ou instante diferentes geram chaves distintas. |

## Validação de homologação

1. Aplicar o branch em preview de homologação sem alterar produção.
2. Acionar a rota autenticada uma vez e observar que o heartbeat é inserido somente ao encerramento da execução.
3. Na execução seguinte, verificar que a consulta usa exclusivamente registros anteriores ao novo início.
4. Confirmar que a resposta, `integration_health_states` e alertas refletem o último estado anterior, sem classificação artificialmente saudável da rodada em curso.
5. Registrar apenas resultados sanitizados; não incluir segredos de cron, URLs de banco ou tokens em logs, commits ou PRs.

O cron mantém a cadência definida em `vercel.json`; esta correção não cria timers no processo e não altera a agenda, os limites de alerta ou o fluxo de Slack.

## Evidência registrada — 2026-08-20

| Verificação | Resultado | Situação |
|---|---|---|
| Teste direcionado | `integration-health.test.ts` aprovou 10 cenários, incluindo autoavaliação, pico de dead letters, recuperação e deduplicação. | Aprovado. |
| Validação local completa | `pnpm typecheck`, `pnpm test` (148 aprovados; 3 ignorados), `pnpm audit --prod` e `pnpm build` concluíram sem falhas. | Aprovado. |
| Preview Vercel | O deployment do commit `1089d5a` no branch `fix/sympla-health-self-check` concluiu com estado `READY`. | Aprovado. |
| Proteção HTTP do cron | Uma requisição sem cabeçalho `Authorization` ao preview respondeu `401` e `{"error":"Não autorizado."}`. Nenhum heartbeat foi iniciado. | Aprovado. |
| Chamada autenticada do cron | Uma única chamada ao Preview, após autorização explícita e com credencial temporária não persistida, respondeu `HTTP 200`. A resposta reportou `status="critical"`, `checkedAt` preenchido, avaliação de 4 rotas e `health.integration-health.lastExecutedAt=null`. | Aprovado. |
| Confirmação de runtime | O log de runtime do Preview registrou `GET /api/cron/integration-health 200` no deployment do branch `fix/sympla-health-self-check`. | Aprovado. |
| Proteção do Preview | A autenticação Vercel foi suspensa apenas durante a chamada, imediatamente reativada para `preview` e conferida no painel e pela API. | Aprovado. |

> A resposta real com `health.integration-health.lastExecutedAt=null` demonstra que a rodada em curso não foi usada como evidência de sua própria saúde quando não havia execução anterior elegível. O status global `critical` permaneceu legítimo: ele refletiu atrasos de outros crons monitorados e duas dead letters Sympla já existentes, não uma autoaprovação artificial. A confirmação direta de linhas em `integration_health_states` e de entregas Slack não foi executada para evitar acesso adicional ao banco e envio de alertas durante o ensaio; essas verificações continuam explicitamente separadas.
