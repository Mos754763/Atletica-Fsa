# Operação de Logs, Alertas Slack e Idempotência — ATLETICA FSA

**Projeto:** ATLETICA FSA  
**Atualizado em:** 15 de agosto de 2026  
**Objetivo:** detectar falhas serverless sem ruído operacional e testar Webhooks Mercado Pago contra reentregas e concorrência.

## 1. Inspeção de falhas ocultas nas funções Vercel

Os **Build Logs** mostram falhas de compilação e publicação; eles não substituem os **Runtime Logs**, que registram invocações das Vercel Functions, status HTTP e mensagens do servidor. A Vercel disponibiliza os Runtime Logs na área **Logs** do projeto, com filtros por ambiente, rota, tipo de requisição, status, nível e deployment. [1] [2]

### Procedimento pelo painel

No painel Vercel, abra **ATLETICA FSA → Logs** e use a janela de tempo de 24 horas ou uma janela personalizada que cubra a última execução esperada do cron.

| Investigação | Filtros no painel | O que é normal | Sinal de incidente |
| --- | --- | --- | --- |
| Sincronização Sympla | Environment: `production`; Route: `/api/cron/sympla-sync`; Request type: `cron` | `200` e execução uma vez por dia. | `5xx`, timeout, ausência superior a 26 horas ou mensagens de token inválido. |
| Lembretes de eventos | Route: `/api/cron/event-reminders`; Request type: `cron` | `200` diário. | `5xx` ou ausência superior a 26 horas. |
| Saúde de integrações | Route: `/api/cron/integration-health`; Request type: `cron` | `200` diário às 18:00 UTC. | `503`, falha de banco ou ausência do heartbeat por mais de 36 horas. A própria rota acompanha o heartbeat de sua execução anterior; a execução diária normal permanece saudável. |
| Webhook Mercado Pago | Route: `/api/payments/mercado-pago/webhook`; Method: `POST`; Resource: `Vercel Functions` | `200` para eventos processados ou ignorados. | `5xx`, timeout ou crescimento de erros internos. |

Após filtrar, selecione **Level: Error e Fatal** e **Status code: 5xx**. Abra cada linha para registrar o `RequestId`, o deployment, a rota, o horário UTC, o status e a exceção. Em seguida, compare com a tabela `scheduled_route_heartbeats` e com o log de atividade do CRM. A Vercel classifica respostas `5xx` como erro; respostas `4xx` aparecem como warning. [2]

> Uma chamada manual à rota cron sem `Authorization: Bearer <CRON_SECRET>` retorna `401` por desenho. Ela não é uma falha do cron e não deve gerar incidente.

### Procedimento por CLI

Instale ou execute temporariamente a CLI, faça login e vincule o diretório apenas uma vez:

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link --project atletica-fsa --scope moises-faustino-rodrigues-s-projects
```

Para procurar problemas recentes de função em produção:

```bash
pnpm dlx vercel@latest logs \
  --project atletica-fsa \
  --environment production \
  --source serverless \
  --level error --level fatal \
  --since 24h --expand
```

Para observar uma janela de cron em tempo real, inicie o comando alguns minutos antes do horário UTC e interrompa após a resposta:

```bash
pnpm dlx vercel@latest logs \
  --project atletica-fsa \
  --environment production \
  --source serverless \
  --follow
```

O comando `vercel logs` suporta filtros por ambiente, fonte, nível, status, intervalo, deployment e saída JSON. O modo `--follow` transmite logs do deployment atual por até cinco minutos. [3]

## 2. Cobertura Slack já implantada

O canal Slack foi validado com uma entrega controlada **HTTP 200**. A implementação atual tem timeout de oito segundos e persiste o resultado do envio para auditoria.

| Origem de falha | Cobertura atual | Proteção contra ruído | Próximo comportamento esperado |
| --- | --- | --- | --- |
| Falha de sincronização Sympla / dead letter | **Coberta.** O alerta contém código, execução e ocorrência. | Chave de deduplicação por integração, código de erro e janela de hora. | Corrigir a causa no ERP e reprocessar a dead letter. |
| Pico de falha de saúde Sympla | **Coberto.** A rota diária envia alerta em mudança de estado. | Claim persistente em `integration_alerts`; não envia o mesmo incidente repetidamente. | Investigar token, logs e métricas. |
| Recuperação Sympla | **Coberta.** Envia alerta quando o estado retorna a saudável. | Só dispara em transição para saudável. | Encerrar o incidente e monitorar. |
| Heartbeat ausente ou falho de Sympla / lembretes | **Coberto pelo health check.** A rota diária classifica ausência, falha ou atraso. | Deduplicação persistente por incidente de rotas cron. | Conferir logs Vercel e `scheduled_route_heartbeats`. |
| Erro interno do Webhook Mercado Pago | **Ainda não envia Slack diretamente.** A rota possui respostas e auditoria, mas não publica alerta para cada erro. | Evita expor detalhes de pagamento e alertas por assinatura inválida. | Recomenda-se alertar apenas exceções `5xx` persistentes ou falha de conciliação, nunca `401/403/400` isolados. |
| Erro genérico de Vercel Function | **Não há coleta automática pela aplicação.** | Não aplicável. | Usar filtros dos Runtime Logs; Log Drains é opção de plataforma quando disponível no plano. [1] |

Para estender a cobertura Mercado Pago, a política recomendada é criar um alerta somente após a mesma falha interna ocorrer mais de uma vez na janela definida, usando uma chave de deduplicação sem valores, e-mails, tokens, `external_reference` completo ou dados do pagador. Não envie alertas para tentativa com assinatura inválida, dado que ela pode ser tráfego adversarial e cria ruído.

## 3. Matriz de teste de idempotência Mercado Pago

Execute testes de pagamento apenas com credenciais de teste e banco isolado. Em Production, mantenha `PAYMENTS_ENABLED=false` enquanto a homologação não estiver aprovada.

| Cenário | Preparação | Ação | Asserções obrigatórias |
| --- | --- | --- | --- |
| Reentrega idêntica | Criar pedido de teste e evento `payment` assinado. | Enviar exatamente o mesmo corpo e headers duas vezes. | Uma linha de pagamento, uma liquidação, uma baixa de estoque, uma emissão de ingresso; segunda resposta não cria efeitos novos. |
| Reentrega com novo `request-id` | Mesmo `data.id` e conteúdo comercial; assinatura válida com novo Request ID. | Enviar duas requisições serialmente. | O evento de provedor é reconhecido como já processado; nenhuma segunda baixa de estoque. |
| Concorrência | Mesmo payload válido e banco de teste. | Disparar 5–10 `POST`s simultâneos com `Promise.all`. | No máximo uma transação liquida; as demais retornam comportamento idempotente; não há estoque negativo. |
| Chave reutilizada com valor divergente | Mesmo identificador ou referência, total alterado. | Enviar evento assinado com valor diferente. | Não liquidar; abrir investigação/reconciliação e registrar a divergência. |
| Assinatura inválida | Alterar um byte de `x-signature`. | Enviar uma vez. | `401` ou resposta segura equivalente; nenhuma consulta/alteração comercial. |
| Replay expirado | Assinar timestamp fora da janela permitida. | Enviar uma vez. | Rejeitar antes da conciliação; nenhuma mutação. |
| Falha após consulta ao provedor | Mockar timeout/transiente da API. | Reenviar após a primeira falha. | Retentativa segura, sem duplicar pagamento/baixa; manter evento para reconciliação quando aplicável. |

O projeto já possui cobertura de referência para as propriedades mais críticas: uma tentativa Point chama o provedor uma única vez com a mesma chave; reentrega idêntica liquida uma vez; uma versão posterior da mesma ordem não baixa novamente; assinatura adulterada, timestamp expirado, valor divergente e ordem desconhecida não liquidam estoque. A suíte está em `src/lib/payments/point-resilience.test.ts`.

> A regra de ouro é testar o **estado final do banco**, não apenas o status HTTP: conte pagamentos, movimentos de estoque, inscrições/ingressos e eventos de Webhook para cada cenários de reentrega.

## Referências

[1]: https://vercel.com/docs/functions/logs "Vercel — Function Logs"
[2]: https://vercel.com/docs/logs/runtime "Vercel — Runtime Logs"
[3]: https://vercel.com/docs/cli/logs "Vercel — CLI Logs"
