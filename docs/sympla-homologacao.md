# Homologação da Integração Sympla

**Estado:** homologação de leitura validada com credencial de servidor.  
**Atualizado em:** 14 de agosto de 2026.

## Evidências verificadas

A documentação pública atual da Sympla declara a URL base `https://api.sympla.com.br/public` e determina o uso do cabeçalho privado `s_token` em operações autenticadas. O portal lista rotas de eventos, pedidos, participantes, apresentações e check-in por participante, número de ingresso e QR Code.[1]

Na documentação pública consultada não há um recurso de webhook ou callback nativo listado. Assim, a primeira homologação deve usar sincronização incremental e limitada de leitura, com cursor persistente, paginação, chave de deduplicação e backoff para `429` e `5xx`; não será criado um listener de webhook Sympla sem confirmação formal do provedor.

## Limites de segurança da primeira fase

1. A credencial `s_token` deve existir apenas em variável de ambiente do servidor (`SYMPLA_API_TOKEN`), nunca em código, banco de dados de configuração público ou navegador.
2. A integração começa em modo **somente leitura**: eventos, pedidos e participantes podem ser listados e normalizados, mas não alterarão estoque interno, pagamento, emissão de ticket ou check-in local.
3. Cada evento vinculado deve declarar um único sistema mestre para vendas, ingressos, check-in e capacidade. Enquanto essa escolha não existir, a plataforma somente mostrará divergências.
4. A homologação utiliza somente a listagem externa de eventos. Pedidos, participantes e check-in permanecem fora do sincronizador até que um evento seja explicitamente vinculado e conciliado.

## Componentes implementados

| Componente | Responsabilidade | Garantia de segurança |
|---|---|---|
| `src/lib/integrations/sympla.ts` | Cliente da API, cabeçalho `s_token`, timeout de 8 segundos e retentativa limitada para rede, `408`, `429` e `5xx`. | O token é lido somente de `SYMPLA_API_TOKEN` no servidor e não integra a resposta da API interna. |
| `src/lib/integrations/sympla-sync.ts` | Consulta, normaliza e espelha os eventos da Sympla na agenda FSA. | O espelho usa chave única de provedor/evento, mantém `requires_registration=false` e não chama rotinas de pedido, pagamento, ticket, QR, estoque ou check-in. |
| Migração `20260814220000_sympla_event_mirroring.sql` | Adiciona origem, identificador e URL externa ao evento espelhado. | Eventos de origem `sympla` são identificados e vinculados ao registro externo sem se tornarem eventos comerciais internos. |
| Migração `20260814210000_sympla_homologation_integration.sql` | Cria integrações, vínculos futuros, registros externos, execuções e fila de falhas. | RLS permite leitura operacional apenas a administradores; payload externo fica separado das tabelas nativas. |
| `/admin/integracoes/sympla` | Painel administrativo para executar e auditar a sincronização manual. | A página e a ação de servidor exigem o papel `admin`. |
| `/api/cron/sympla-sync` | Sincronização incremental diária às 14:00 UTC no plano Vercel Hobby; o painel administrativo permite execução manual imediata. | Requer `Authorization: Bearer CRON_SECRET`, processa somente leitura e devolve `503` em falha para observabilidade. |
| `/api/cron/integration-health` | Avalia semanalmente a volumetria de falhas, taxa de erro e batimentos das rotas de sincronização e lembretes. | Requer `Authorization: Bearer CRON_SECRET`, persiste somente métricas sanitizadas e não altera dados de eventos, pedidos ou ingressos. |
| Migração `20260814240000_integration_health_and_recovery_alerts.sql` | Registra estado persistente de saúde e batimentos de cron; habilita alertas de pico e recuperação. | A chave única por integração, escopo, tipo e incidente impede alertas duplicados durante a mesma ocorrência. |
| Migrações `20260814230000` e `20260814230500` | Criam a deduplicação persistente de alertas, o bloqueio de replay e o responsável pela resolução da falha. | A ocorrência não é resolvida até uma nova sincronização bem-sucedida; o administrador responsável é preservado. |
| `src/lib/integrations/slack-alerts.ts` | Emite alerta sanitizado ao canal Slack para falhas terminais da sincronização. | Usa `SLACK_SYMPLA_ALERT_WEBHOOK_URL` somente no servidor, timeout de 8 segundos e não envia token, payload, QR ou dados de participantes. |
| Reprocessar em `/admin/integracoes/sympla` | Permite a um administrador reivindicar e reexecutar uma dead letter. | Impede execução concorrente por 10 minutos, registra tentativa, nova execução e resolução apenas após sucesso. |

## Validação realizada

A credencial de servidor foi aceita pela rota leve de listagem de eventos. A sincronização de homologação foi executada e persistiu o catálogo externo, o espelho idempotente na tabela `events`, o vínculo de origem e uma execução auditável. Os testes cobrem normalização, envio restrito do token no cabeçalho, rejeição sem retentativa de `401`, conectividade real e materialização isolada de eventos.

## Como os eventos aparecem na plataforma

Eventos publicados na Sympla são criados ou atualizados na agenda pública e administrativa da ATLETICA FSA com origem visível **Sympla**. A página pública apresenta o botão “Ver inscrições na Sympla”, que abre a URL informada pelo provedor. A área administrativa mostra a origem e suprime lote, transição de status e controles internos de check-in para esses espelhos.

Se o evento for cancelado na Sympla, o espelho local passa a `encerrado` e deixa de ser listado publicamente. Uma alteração futura de nome, data, imagem ou URL na Sympla atualiza o mesmo espelho no próximo ciclo; não cria duplicata.

## Falhas, reprocessamento e alertas

Quando uma sincronização falha, a plataforma cria uma entrada em `event_sync_dead_letters`, registra a execução em `event_sync_runs` e tenta entregar um alerta resumido ao Slack. A chave de deduplicação combina a integração, o código de falha e uma janela horária. Por isso, uma mesma indisponibilidade não gera uma avalanche de notificações, mas uma nova ocorrência em janela posterior continua visível para a equipe.

O administrador deve corrigir a causa antes de usar **Reprocessar** na tela de integrações. A ação não apaga a ocorrência: ela a reivindica atomicamente, inicia uma execução de origem `replay` e só preenche `resolved_at`, `resolved_by` e `last_replay_run_id` após sucesso. Se falhar novamente, a dead letter permanece pendente e o histórico é preservado.

| Situação | Estado da ocorrência | Comportamento do alerta |
|---|---|---|
| Token inválido, evento inválido ou contrato incompatível | Pendente até intervenção administrativa. | Alerta deduplicado no Slack; corrigir a causa antes do replay. |
| Timeout, `429` ou `5xx` do provedor | Pendente, mas passível de nova execução segura. | Um alerta por categoria e janela; o cron pode tentar novamente. |
| Reprocessamento concorrente | Não altera a ocorrência já reivindicada. | Não cria nova entrega de alerta. |
| Reprocessamento concluído | Marcada como resolvida, com administrador e execução vinculados. | Nenhuma notificação adicional é enviada. |

Os testes cobrem geração de chave por janela, conteúdo sanitizado, entrega HTTP bem-sucedida, indisponibilidade do Slack, ausência de configuração, falha de rede, conexão real do webhook e isolamento do sincronizador Sympla.

## Monitoramento semanal e recuperação

A Vercel executa `/api/cron/integration-health` às segundas-feiras, 18:00 UTC. A rotina calcula as métricas da integração Sympla, grava o último estado em `integration_health_states` e consulta o último batimento de `/api/cron/sympla-sync` e `/api/cron/event-reminders` em `scheduled_route_heartbeats`. Os dois batimentos diários devem ocorrer em até 26 horas; falha registrada, ausência de batimento ou atraso além desse limite é classificado como crítico.

| Nível | Critério de dead letters e falhas | Ação no Slack |
|---|---|---|
| Saudável | Abaixo de todos os limiares e rotas cron dentro da cadência. | Nenhum alerta, salvo uma recuperação após incidente aberto. |
| Atenção | Ao menos 3 dead letters abertas, 3 novas em 15 minutos, ocorrência aberta há mais de 30 minutos, taxa de falha acima de 10% ou cron próximo do atraso limite. | Alerta de pico uma única vez por incidente e escopo. |
| Crítico | Ao menos 10 dead letters abertas, 6 novas em 15 minutos, ocorrência aberta há mais de 60 minutos, taxa de falha acima de 25%, cron falho, ausente ou atrasado. | Alerta de pico uma única vez por incidente e escopo. |

Quando um estado de atenção ou crítico volta a saudável, a rotina envia `sympla_health_recovered` com o início do incidente anterior como chave de deduplicação e limpa `incident_started_at`. Dessa forma, um alerta de recuperação só existe para um incidente efetivamente observado e não é repetido em semanas saudáveis subsequentes. Os testes unitários cobrem os limiares, transições de recuperação e batimentos recente, atrasado, ausente ou falho.

## Próxima decisão operacional

Antes de importar pedidos ou participantes, deve ser escolhido um evento de teste e registrado um vínculo em `event_external_links`. A decisão recomendada para a primeira fase é **Sympla como fonte de inscrições e participantes apenas**, com a ATLETICA FSA mantendo o fluxo proprietário de catálogo, estoque, pagamentos Mercado Pago, QR de retirada e check-in interno. Uma alteração para Sympla como sistema mestre de ingresso/check-in exige reconciliação explícita e não será ativada automaticamente.

## Fonte

[1]: https://developers.sympla.com.br/api-doc/ "Sympla Public API Docs"
