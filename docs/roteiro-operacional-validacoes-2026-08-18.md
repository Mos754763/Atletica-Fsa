# Roteiro operacional de validações — e-mail, ingressos e Sympla

**Data:** 18/08/2026  
**Escopo:** validações posteriores à recuperação da integração Sympla.  
**Princípio de segurança:** manter `PAYMENTS_ENABLED=false` em Production. Qualquer cobrança teste deve ocorrer somente em sandbox/homologação até autorização explícita e evidência técnica completa.

## 1. Entrega real de e-mails

O SMTP customizado do Supabase Auth está configurado com o remetente `noreply@atleticafsa.site`. O próximo objetivo não é apenas verificar a aceitação pela API: é provar a entrega, a renderização e a utilização segura dos links em uma caixa externa controlada.

| Ordem | Ação | Evidência de aceite | Onde verificar |
|---|---|---|---|
| 1 | Confirmar no Resend que o domínio remetente continua com SPF e DKIM verificados; adicionar ou corrigir DMARC antes de aumentar volume. | Domínio autorizado e registros DNS saudáveis. | Resend → Domains e provedor DNS. |
| 2 | Preparar uma caixa externa sob controle da operação, por exemplo um Gmail ou Outlook institucional que não pertença à equipe Supabase. | Endereço apto a receber a mensagem real. | Caixa de entrada e pasta Spam. |
| 3 | Cadastrar uma conta de teste por e-mail/senha no fluxo público e concluir a confirmação enviada pelo Supabase. | Mensagem chega, apresenta `noreply@atleticafsa.site`, o link aponta à origem canônica e a confirmação abre a aplicação. | Caixa externa, Supabase Auth → Users e logs do Resend. |
| 4 | Solicitar uma recuperação de senha uma única vez e concluir a redefinição. | Mensagem entregue, link utilizável uma vez e senha alterada apenas para a conta de teste. | Caixa externa, Supabase Auth e login. |
| 5 | Criar uma inscrição em evento gratuito de teste e verificar o e-mail transacional de inscrição/ingresso. | Corpo contém título do evento e código de check-in; uma tentativa não duplica e-mails. | Fila `email_outbox`, log de atividade e caixa externa. |
| 6 | Registrar para cada mensagem o horário, destinatário mascarado, tipo, identificador da entrega e resultado. | Matriz de teste preenchida sem expor conteúdo de tokens. | Documento de evidência e painel Resend. |

Não se deve usar endereços descartáveis ou compartilhar links de confirmação. A documentação do Supabase recomenda SMTP customizado para fluxos de produção e destaca SPF, DKIM e DMARC como controles de entregabilidade; o Resend requer domínio verificado para envio com endereços próprios. [1] [2]

> Critério de aprovação: os três tipos — confirmação de conta, recuperação de senha e confirmação de inscrição — chegam a uma caixa externa, apontam para `atleticafsa.site`, passam pela ação prevista e têm rastreabilidade sem vazar tokens.

## 2. Ensaio de venda e sincronização de ingressos

Há dois fluxos distintos e eles não devem ser confundidos. A venda nativa da ATLETICA FSA cria e liquida inscrições internas; a integração atual da Sympla é **outbound e somente leitura na API da Sympla**, espelhando metadados do catálogo de eventos. Ela não importa, até este momento, compradores, pagamentos, QR codes ou check-ins originados na Sympla.

| Fluxo | Ambiente de teste | Sequência | Critérios de aceite |
|---|---|---|---|
| Evento gratuito nativo | Homologação ou evento de teste identificado | Criar evento/lote gratuito → inscrição autenticada → e-mail → abrir ingresso → validar QR uma vez → repetir leitura. | Registro confirmado, código válido, primeiro check-in aceito e segunda tentativa idempotentemente bloqueada. |
| Evento pago nativo | Somente homologação com credenciais sandbox | Criar lote pago → iniciar Checkout Pro → aprovar com comprador sandbox → receber webhook assinado → liquidar ticket → receber e-mail → validar QR. | `payments`, `payment_webhook_events` e inscrição coerentes; ticket emitido uma vez; valor confere; reenvio do mesmo webhook resulta em duplicata ignorada. |
| Venda de produto nativa | Somente homologação com credenciais sandbox | Criar pedido → Checkout Pro → webhook aprovado → liquidação de estoque → e-mail de status. | Pedido pago uma vez, estoque liquidado uma vez e reenvio do webhook idempotente. |
| Catálogo Sympla | Production pode ser usada, pois o conector é somente leitura | Criar/atualizar um evento de teste na Sympla → sincronização manual → segunda sincronização idêntica. | Registros em `event_sync_runs`, `external_event_records`, `event_external_links` e espelho em `events`; segunda execução não gera duplicação. |

Para a venda paga nativa, o webhook já valida assinatura e janela de frescor, confere o valor junto ao registro, usa uma chave de evento idempotente e aciona a liquidação transacional do ingresso. A confirmação de inscrição é enviada somente se a transição para o estado liquidado ocorreu. Portanto, **não se deve habilitar pagamentos em Production para este ensaio**; o gate só pode ser aberto após a aprovação sandbox documentada.

> Critério de aprovação do ensaio completo: cada etapa possui uma evidência rastreável de origem, e nenhum pagamento, estoque ou ingresso é duplicado ao repetir a notificação externa.

Se a operação precisar consolidar no ERP pagantes, inscritos e check-ins que nasceram na Sympla, será necessária uma expansão posterior da integração para importar inscrições/participantes da API da Sympla. Isso é escopo novo, pois o conector atual espelha exclusivamente o catálogo de eventos.

## 3. Alertas automáticos para falhas da Sympla

O mecanismo já está implementado e usa `SLACK_SYMPLA_ALERT_WEBHOOK_URL` como segredo server-side. Quando uma sincronização falha, o sistema grava a execução, abre uma dead letter, registra atividade CRM e solicita o alerta no Slack. A chave de deduplicação agrupa falhas equivalentes da mesma integração por hora, evitando ruído. O health check também envia um alerta quando muda para `warning` ou `critical` e outro quando a integração volta a `healthy`.

| Componente | Configuração atual | Função operacional |
|---|---|---|
| `SLACK_SYMPLA_ALERT_WEBHOOK_URL` | Segredo de Production na Vercel. | Recebe as mensagens de falha, pico de saúde e recuperação. |
| `SYMPLA_API_TOKEN` | Segredo de Production na Vercel. | Autoriza a consulta server-side à API Sympla; não pode ser exposto ao cliente. |
| `CRON_SECRET` | Segredo de Production na Vercel. | Autoriza endpoints periódicos chamados pela Vercel. |
| `/api/cron/sympla-sync` | `0 14 * * *` em UTC. | Consulta diariamente o catálogo Sympla; corresponde a 11:00 em UTC−3. |
| `/api/cron/integration-health` | `0 18 * * 1` em UTC. | Avalia saúde e heartbeats toda segunda-feira; corresponde a 15:00 em UTC−3. |
| `/api/cron/event-reminders` | `0 13 * * *` em UTC. | Processa lembretes e a fila de e-mails diariamente; corresponde a 10:00 em UTC−3. |

### Configuração e validação recomendadas

1. No Slack, criar ou selecionar um canal operacional, por exemplo `#alertas-integracoes`, e criar um Incoming Webhook para esse canal. O webhook deve ser salvo apenas como `SLACK_SYMPLA_ALERT_WEBHOOK_URL` no escopo **Production** da Vercel; nunca em código, commit ou cliente web.
2. Confirmar que `SYMPLA_API_TOKEN` e `CRON_SECRET` também existem em Production, e que o deploy mais recente está **Ready**. Uma alteração de variáveis exige novo deploy para atingir funções já publicadas.
3. Manter os três schedules declarados em `vercel.json`. A Vercel aciona essas rotas por HTTP GET na URL de Production e interpreta expressões cron em UTC. [3]
4. Para comprovar o alerta sem afetar a operação, usar **Preview/homologação** e um canal Slack de teste. Inserir temporariamente um token Sympla deliberadamente inválido apenas no ambiente isolado, executar uma sincronização manual e validar: uma dead letter, uma mensagem Slack e um log CRM.
5. Restaurar o token de homologação, executar uma sincronização bem-sucedida e disparar o health check autorizado nesse mesmo ambiente. Validar uma única mensagem de recuperação e o retorno do estado para `healthy`.
6. No ERP, operar os incidentes em **Integrações → Sympla**: revisar a execução, corrigir a causa e somente então usar **Reprocessar**. O reprocessamento é protegido por claim transacional para impedir que duas pessoas processem a mesma ocorrência ao mesmo tempo.

### Configuração das variáveis na Vercel

No projeto **ATLETICA FSA** da Vercel, acessar **Settings → Environment Variables → Add New** e cadastrar os valores abaixo. A URL do Slack, o token da Sympla e o segredo do cron são dados confidenciais: devem ser inseridos no campo de valor protegido do painel, sem cópia para arquivos versionados, navegador público ou variáveis `NEXT_PUBLIC_*`.

| Nome | Valor esperado | Ambientes | Finalidade |
|---|---|---|---|
| `SLACK_SYMPLA_ALERT_WEBHOOK_URL` | URL de Incoming Webhook do canal operacional Slack. | Production; Preview somente se houver canal de testes independente. | Entrega dos alertas de falha, pico de saúde e recuperação. |
| `SYMPLA_API_TOKEN` | Token criado na conta Sympla que controla os eventos. | Production; valor de homologação distinto em Preview. | Cabeçalho server-side `s_token` para consulta ao catálogo. |
| `CRON_SECRET` | Cadeia aleatória longa e exclusiva por ambiente. | Production e Preview, com valores diferentes. | Protege as rotas cron contra chamadas não autorizadas. |

Após salvar as variáveis, executar **Redeploy** da versão atual em Production. Os valores ficam disponíveis apenas para novas execuções server-side após a implantação; o deploy não deve mudar `PAYMENTS_ENABLED`, que deve continuar `false` em Production. A Vercel executa os crons de Production por requisições HTTP GET e usa UTC nas expressões agendadas. [3]

> Critério de configuração: a URL Slack não aparece em código ou logs; a variável existe nos ambientes corretos; o deploy está `Ready`; e uma falha simulada em homologação gera uma mensagem somente no canal Slack de teste.

### Comandos cURL para teste local da Sympla

Não há, na arquitetura atual, um **webhook inbound da Sympla** para receber um `POST`. A aplicação consulta a API pública da Sympla com `GET /public/v1.6.0/events`, usando o header server-side `s_token`. Portanto, a simulação local correta chama a rota cron de sincronização, não inventa um webhook inexistente. A sincronização não altera dados na Sympla, mas persiste no banco local/homologação a execução, o espelho de catálogo, batimentos e falhas auditáveis. [4]

Antes de executar os comandos, preparar `.env.local` com **Supabase de homologação/teste**, um `CRON_SECRET` local exclusivo, um `SYMPLA_API_TOKEN` de teste e, para o ensaio de alerta, uma URL de Slack apontando para canal de teste. Reiniciar `pnpm dev` após qualquer alteração no arquivo. Nunca aponte o processo local ao banco de Production.

```bash
# Terminal 1 — iniciar a aplicação local com as variáveis de homologação em .env.local
pnpm dev
```

```bash
# Terminal 2 — validar a sincronização pelo contrato idêntico ao cron
# Resposta esperada: HTTP 200 e JSON com "ok": true e "mode": "read_only".
export CRON_SECRET='o-mesmo-segredo-exclusivo-definido-no-env-local'

curl --silent --show-error --fail-with-body \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  'http://localhost:3000/api/cron/sympla-sync'
```

```bash
# Teste de autorização — deve devolver HTTP 401 e não iniciar sincronização.
curl --include --silent --show-error \
  --header 'Authorization: Bearer segredo-incorreto' \
  'http://localhost:3000/api/cron/sympla-sync'
```

```bash
# Inspeção externa opcional da credencial: faz uma única consulta GET à Sympla,
# sem escrita na plataforma externa. Não coloque o token literalmente no histórico do shell.
export SYMPLA_API_TOKEN='token-de-teste-carregado-apenas-na-sessao-local'

curl --silent --show-error --fail-with-body \
  --header "s_token: ${SYMPLA_API_TOKEN}" \
  --header 'accept: application/json' \
  'https://api.sympla.com.br/public/v1.6.0/events?page_size=10'
```

Para exercitar a falha e o alerta, substituir **temporariamente e apenas no `.env.local` de homologação** o token da Sympla por um valor deliberadamente inválido, reiniciar o processo local e repetir o primeiro comando. O esperado é HTTP 503 na rota, uma execução falha e uma dead letter; o Slack só receberá a notificação se `SLACK_SYMPLA_ALERT_WEBHOOK_URL` apontar ao canal de teste. Restaurar o token válido, reiniciar a aplicação e repetir a sincronização para recuperar o fluxo.

```bash
# Avaliar a saúde e testar a transição de recuperação exclusivamente em homologação.
# Esta chamada pode registrar estado e, se houver mudança, enviar alerta ao Slack de teste.
curl --silent --show-error --fail-with-body \
  --header "Authorization: Bearer ${CRON_SECRET}" \
  'http://localhost:3000/api/cron/integration-health'
```

O comando abaixo valida apenas o webhook Slack de teste. Ele **publica uma mensagem externa** no canal configurado e, por isso, não deve ser usado com a URL do canal de Production.

```bash
export SLACK_SYMPLA_ALERT_WEBHOOK_URL='webhook-do-canal-de-teste'

curl --silent --show-error --fail-with-body \
  --request POST \
  --header 'content-type: application/json' \
  --data '{"text":"[TESTE LOCAL] Alerta Sympla — mensagem de validação sem incidente real."}' \
  "${SLACK_SYMPLA_ALERT_WEBHOOK_URL}"
```

### Plano de contingência para indisponibilidade da Sympla em pico de vendas

O catálogo Sympla é uma integração **eventualmente consistente**: a API externa é consultada para espelhar metadados, mas a aplicação mantém o último espelho bem-sucedido no banco próprio. Em consequência, uma indisponibilidade da Sympla não deve interromper venda nativa, emissão de ingressos internos, check-in por QR nem os eventos internos já publicados. A operação não deve habilitar pagamentos ou alterar o `PAYMENTS_ENABLED` como resposta a um incidente externo.

| Fase | Gatilho e decisão | Ação operacional | Evidência de saída |
|---|---|---|---|
| Preparação | Antes de campanha ou pico previsto. | Executar sincronização manual bem-sucedida, confirmar o último espelho e registrar responsável de plantão, canal Slack e contato da Sympla. | `event_sync_runs` bem-sucedido, catálogo interno navegável e canal de incidente definido. |
| Detecção | Alerta `warning` ou primeira falha em cron/manual. | Abrir incidente, capturar `sync_run_id`, horário, rota e status HTTP; não reprocessar repetidamente. | Registro no CRM, log Vercel e execução auditada. |
| Contenção | `critical`, falha persistente por mais de 15 minutos ou múltiplas dead letters. | Manter o último catálogo espelhado, orientar a equipe a usar os eventos internos já disponíveis e, se necessário, divulgar o link externo já gravado no evento. Suspender reprocessamentos manuais concorrentes. | Vendas e check-ins internos operando; uma ocorrência ativa por dead letter. |
| Diagnóstico | Falha de token, limite, rede ou resposta 5xx. | Conferir ambiente/segredo, logs Vercel e resposta da API. O cliente já tenta novamente somente para `408`, `429` e `5xx`, com até três tentativas e atraso exponencial com jitter; `403` requer correção de autorização, não repetição automática. | Causa classificada sem registrar token, payload sensível ou dados pessoais. |
| Recuperação | Uma consulta externa volta a responder com sucesso. | Executar uma sincronização manual única, confrontar `records_read` e `records_mirrored`, revisar vínculos externos e só então reprocessar dead letters relevantes. | Nova execução `succeeded`, espelho reconciliado e alerta único de recuperação. |
| Pós-incidente | Serviço estabilizado. | Registrar linha do tempo, causa, impacto, ações e prevenção; revisar limiares se o alerta chegou tarde ou gerou ruído. | Atividade CRM e documento de incidente fechados. |

Os limites já usados pelo health check são: **warning** com três dead letters abertas, três novas em 15 minutos, idade acima de 30 minutos ou falha superior a 10% em uma hora; e **critical** com 10 abertas, seis novas em 15 minutos, idade acima de 60 minutos ou falha superior a 25%. Esses valores devem orientar o runbook, não substituir o julgamento do responsável de plantão.

> Meta operacional proposta: reconhecer um alerta crítico em até 15 minutos, preservar a venda e o check-in internos durante o incidente e iniciar a reconciliação dentro de 30 minutos após a primeira sincronização bem-sucedida. Essas são metas de operação a validar com a equipe, não garantias do provedor externo.

### Monitoramento e rastreabilidade em tempo real na Vercel

O ponto inicial é **Vercel → Project → Logs**, em ambiente **Production**, com acompanhamento ao vivo das rotas `/api/cron/sympla-sync` e `/api/cron/integration-health`. Os runtime logs da Vercel podem ser vistos em tempo real e filtrados por rota; a área de Cron Jobs também oferece **View Log** para cada execução. A Vercel não repete automaticamente uma invocação de cron que falha, portanto uma falha precisa permanecer visível no banco, no Slack e no procedimento de reprocessamento. [3] [5]

| Camada | O que filtrar ou consultar | Chave de correlação | Como usar durante o incidente |
|---|---|---|---|
| Vercel Logs | Production; rotas de sincronização e saúde; respostas `401`, `503` e `5xx`; intervalo do incidente. | Horário UTC, caminho e deployment. | Separar falha de autenticação, configuração e indisponibilidade externa. |
| Vercel Observability | Functions e External APIs; error rate, invocações e duração por rota. | Janela temporal e rota. | Detectar aumento de erros, latência e chamadas externas antes do próximo cron. |
| `event_sync_runs` | `status`, `trigger_source`, `error_code`, `error_detail`, `records_read`, `records_upserted` e `completed_at`. | `sync_run_id`. | Confirmar se a sincronização começou, falhou, leu ou espelhou registros. |
| `event_sync_dead_letters` | Ocorrências abertas, fase, causa e status de reprocessamento. | `dead_letter_id` + `sync_run_id`. | Conter falhas, atribuir responsável e reprocessar somente após a causa corrigida. |
| `scheduled_route_heartbeats` | Rota, status, duração e última execução. | Caminho da rota e timestamp. | Detectar cron ausente, atrasado ou com falha. |
| `crm_activity_logs` e `integration_alerts` | Ação, resultado, fonte, entrega Slack e deduplicação. | `integration_id`, `sync_run_id` e `dead_letter_id`. | Produzir a linha do tempo auditável do incidente e da recuperação. |

Para tornar os Logs ainda mais investigáveis, os próximos aprimoramentos de código devem usar `console.info`/`console.error` estruturados, sem segredos, com no mínimo `provider`, `integration_id`, `sync_run_id`, `trigger_source`, `duration_ms`, `records_read`, `records_mirrored`, `http_status` e `error_code`. Tokens `s_token`, URLs completas de webhook Slack, payloads crus com dados de participantes e e-mails não devem ser enviados a logs. A Vercel oferece visão de funções e de APIs externas dentro de Observability; consultas salvas ou exportação para um coletor externo só devem ser adotadas quando a retenção do plano atual não for suficiente. [5] [6]

> Critério de aprovação: uma falha controlada produz uma mensagem Slack e uma dead letter; falhas repetidas não geram spam; a recuperação produz uma única mensagem de normalização; e a auditoria permite relacionar alerta, execução e reprocessamento.

## Ordem recomendada

| Prioridade | Próximo passo | Dependência |
|---|---|---|
| 1 | Realizar a matriz de três e-mails reais com uma caixa externa. | Domínio e SMTP já configurados; confirmar DMARC no Resend/DNS. |
| 2 | Rodar evento gratuito e QR em ambiente isolado. | Usuário de teste e evento/lote de teste. |
| 3 | Executar venda paga sandbox, incluindo webhook e replay. | Autorização explícita, comprador sandbox e `PAYMENTS_ENABLED=true` apenas fora de Production. |
| 4 | Validar espelhamento idempotente de um evento da Sympla. | Evento de teste na conta Sympla. |
| 5 | Simular falha e recuperação de alerta em Preview/homologação. | Canal Slack de teste e aprovação para a alteração temporária de token isolado. |

## Referências

[1] [Supabase — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)  
[2] [Resend — Verified Domains](https://resend.com/docs/dashboard/domains/introduction)  
[3] [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs)  
[4] [Sympla — API pública](https://developers.sympla.com.br/api-doc/)  
[5] [Vercel — Function Logs](https://vercel.com/docs/functions/logs)  
[6] [Vercel — Observability](https://vercel.com/docs/observability)
