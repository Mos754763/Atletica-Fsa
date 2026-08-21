# Diagnóstico operacional — Auditoria de Paridade, Lote A

**Data:** 21 de agosto de 2026  
**Método:** leituras de banco em transação somente leitura, inspeção de código versionado e telemetria somente leitura da hospedagem.

## Evidências consolidadas

Em homologação, a integração Sympla está habilitada, com últimas sincronizações manuais bem-sucedidas em 18/08/2026, nenhuma dead letter aberta e estado de sincronização `healthy`. Entretanto, o estado agregado de rotas cron foi gravado como `critical`: havia somente um batimento bem-sucedido da própria rota `/api/cron/integration-health`, em 20/08/2026, e nenhum batimento prévio das três rotas diárias monitoradas.

| Ambiente | Evidência | Conclusão |
| --- | --- | --- |
| Homologação | `sync = healthy`, zero dead letters abertas, sincronização Sympla habilitada | A integração externa respondeu corretamente na última validação manual registrada. |
| Homologação | `cron_routes = critical`; sem batimentos para `sympla-sync`, `event-reminders` e `member-interest-retention` | As rotas agendadas não foram exercitadas no ambiente de homologação. Isso é compatível com o fato de cron configurado ser ativado somente em deployment de produção. [1] |
| Production | Telemetria agrupou duas falhas entre 18/08/2026 13:44 e 14:41 UTC nas rotas `event-reminders` e `sympla-sync` | A causa observada foi `Configuração privada do Supabase ausente.` no deployment `dpl_6poUYgfvMnDWmAXQ76aVKzbYocyX`. |
| Production | `sync = critical` e 2 dead letters abertas; `cron_routes = critical` | A operação de sincronização e seu monitoramento devem ser recuperados e revalidados antes de nova promoção de código ou schema. |

O código versionado exige `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` para executar serviços internos. A evidência de execução identifica especificamente a ausência da configuração privada; portanto, o primeiro gate é confirmar que `SUPABASE_SECRET_KEY` está configurada no ambiente **Production** da hospedagem e efetivar um novo deployment depois de qualquer correção. Nenhum valor de segredo é registrado neste documento.

> A execução recorrente das rotas configuradas não é um comportamento de preview: a documentação da hospedagem determina que os cron jobs são ativados por deployment de produção. [1]

## Próxima validação controlada

Após confirmar a variável no ambiente de Production e gerar deployment com ela disponível, a validação deve ser feita em duas etapas: primeiro, disparar manualmente as rotas de cron de Production de modo autenticado e observar um novo batimento; segundo, consultar novamente estados, dead letters e alertas. A reexecução de dead letter deve ocorrer somente depois da causa de credencial ter sido eliminada e com resultado auditável.

## Tentativa controlada posterior ao redeploy

Após o redeploy `dpl_FQJfFLfnjXzTAkWJe99Z1iTGp9HM` ter ficado `READY`, foi executada uma tentativa autenticada única para cada rota configurada. As quatro chamadas retornaram `401 Não autorizado`: `event-reminders`, `sympla-sync`, `member-interest-retention` e `integration-health`.

Como o controle de autorização está antes de qualquer acesso ao banco nas rotas, essa tentativa **não criou heartbeat, dead letter, alerta, pedido ou alteração de catálogo**. O resultado prova que o valor temporário usado no teste não corresponde ao valor efetivamente disponível como `CRON_SECRET` no deployment de Production. A recuperação permanece bloqueada até que a variável seja revisada no escopo Production, seja exatamente igual ao segredo de teste e um novo redeploy seja concluído.

Em uma repetição posterior, limitada exclusivamente à rota `/api/cron/integration-health`, a resposta continuou sendo `401 Não autorizado`. Isso confirma que o bloqueio não foi transitório, preservando a necessidade de revisar o nome, o escopo, o valor e a aplicação por redeploy da variável `CRON_SECRET` em Production antes de novos disparos.

## Configuração observada no painel de hospedagem

Em 21/08/2026, o painel autenticado do projeto `atletica-fsa` mostrou `CRON_SECRET` como variável sensível aplicada a **Production e Preview**, atualizada aproximadamente 16 minutos antes da inspeção. A mesma tela mostrou `SUPABASE_SECRET_KEY` como variável sensível de **Production**, atualizada aproximadamente uma hora antes. A presença e o escopo foram confirmados visualmente; os valores permaneceram ocultos e não foram revelados nem registrados.

Essa evidência descarta ausência nominal e desloca a investigação para a igualdade exata do valor de `CRON_SECRET` e sua propagação ao deployment. O próximo passo autorizado é editar a variável existente no painel para substituir o valor pelo segredo temporário validado, preservando os escopos Production e Preview, e realizar um novo redeploy.

## Correção de configuração e redeploy

Após autorização explícita, a variável `CRON_SECRET` foi atualizada no painel autenticado sem registrar ou revelar seu conteúdo. Os escopos permaneceram **Production e Preview**. O painel confirmou a atualização com sucesso e iniciou um novo deployment de Production a partir do `main`, exibindo a confirmação “Deployment created”. A validação de resposta da rota de saúde só será repetida depois que este deployment estiver `READY`.

## Validação no deployment corrigido

O deployment criado após a atualização de `CRON_SECRET` atingiu o estado **Ready**. A primeira repetição havia usado um hostname histórico de deployment e, por isso, retornou `401`; essa chamada não era atendida pelo deployment recém-criado. A chamada autenticada repetida contra o domínio canônico `https://atleticafsa.site` retornou **HTTP 200** e confirmou que o segredo corrigido está disponível no deployment ativo.

O payload de saúde retornou o estado crítico residual da integração Sympla, sem emitir alerta duplicado. A rota `sympla-sync` apresentava batimento saudável em 2026-08-21 14:03 UTC; `event-reminders` permanecia crítico desde 2026-08-19 13:12 UTC; `member-interest-retention` permanecia crítico desde 2026-08-20 15:06 UTC; e o batimento histórico anterior de `integration-health` era de 2026-08-17, sendo a execução validada agora a evidência de recuperação do seu agendamento manual autorizado. Não houve criação de pedidos nem alteração de estoque, preços ou do gate `PAYMENTS_ENABLED`.

## Recuperação de lembretes e reavaliação

Com autorização específica, a rota `/api/cron/event-reminders` foi executada uma única vez no domínio canônico e retornou **HTTP 200** com `queued: 0`, `expiredReservations: 0`, `processed: 0`, `sent: 0` e `failed: 0`. Portanto, a recuperação não enviou e-mails nem modificou reservas. A reavaliação autenticada de `/api/cron/integration-health` retornou **HTTP 200** e classificou `event-reminders` e `integration-health` como saudáveis; `sympla-sync` permaneceu saudável. O único batimento crítico residual é `/api/cron/member-interest-retention`, cujo último sucesso continua em 2026-08-20 15:06 UTC. Essa rotina chama `cleanup_member_interest_abuse_data` e pode eliminar eventos de abuso com mais de 30 dias e contadores de limite de taxa com mais de duas horas; por isso, sua execução manual exige confirmação separada.

## Recuperação de retenção e estado final das rotas

Com autorização específica para a política de retenção, `/api/cron/member-interest-retention` retornou **HTTP 200**. O resultado reportou `deletedEvents: 0` e `deletedRateLimitWindows: 2`; portanto, nenhum evento de abuso foi removido e somente duas janelas de contagem de rate limit já expiradas pela política de duas horas foram eliminadas.

A reavaliação final de `/api/cron/integration-health` retornou **HTTP 200**. Todas as rotas monitoradas passaram a `healthy`: `sympla-sync` (2026-08-21 14:03 UTC), `event-reminders` (2026-08-21 17:56 UTC), `member-interest-retention` (2026-08-21 17:59 UTC) e `integration-health` (2026-08-21 17:57 UTC). A transição de recuperação das rotas registrou envio de alerta de recuperação com deduplicação (`alert: sent`). O escopo de sincronização Sympla ainda está `critical`, pois permanece dependente da investigação e tratamento das dead letters abertas; nenhuma delas foi reprocessada nesta etapa.

## Reconciliação de schema por interface visual

Durante a confirmação adicional da tabela pública presente somente em Production, o SQL Editor autenticado passou a retornar o erro interno `query: Too small: expected string to have >=1 characters` mesmo quando a consulta somente leitura estava visível. Para não insistir em uma execução inválida, a auditoria mudou para o Table Editor em modo estritamente de leitura. A interface confirmou o conjunto de tabelas públicas da Production, incluindo as relações de automação, eventos, CRM e integrações. A identificação final da relação adicional será documentada somente após comparação nominal com a lista de homologação, sem executar DDL ou modificar dados.

Na rolagem controlada do Table Editor, foram observadas adicionalmente as relações de integrações e inventário (`integration_alerts`, `integration_health_states`, `inventory_movements`, `inventory_reservations`), captação de interesse (`member_interest_abuse_events`, `member_interest_applications`, `member_interest_rate_limits`), pedidos e pagamento (`orders`, `order_items`, `order_status_history`, `payments`, `payment_webhook_events`), produtos (`products`, `product_images`, `product_variants`) e RBAC (`permission_grants`, `profile_role_assignments`, `profiles`). A interface não foi usada para editar, criar ou excluir registros.

A comparação nominal identificou a relação adicional de Production: `public.table_name`. Ela não existe no inventário de 47 tabelas de homologação. Pela visualização de definição do Table Editor, a relação possui as colunas `id bigint`, `inserted_at timestamptz`, `updated_at timestamptz`, `data jsonb` e `name text`; a grade de dados estava vazia na página inicial, sem linhas exibidas. O nome genérico e a ausência de migration correspondente indicam que é uma tabela preexistente/experimental fora do modelo versionado, devendo ser tratada como **divergência de schema bloqueadora de promoção** até receber uma decisão explícita de retenção com migration ou de remoção controlada, jamais por alteração ad hoc.

Para a pendência Sympla, a auditoria abriu `public.event_sync_dead_letters` no Table Editor de Production em modo somente leitura. A relação está protegida por uma política RLS e expõe, entre outros, `id`, `integration_id`, `sync_run_id`, `phase` e `error_code`. A carga da grade ainda estava em andamento no instante da captura; nenhum botão de inserção, edição, exclusão ou reprocessamento foi acionado.

A carga concluída confirmou **duas** dead letters abertas, ambas vinculadas à mesma integração (`f937bf2e-f675-4d0d-855a-2017fc7ec277`) e à fase `fetch_events`. Os dois registros registram `error_code = sympla_sync_failed` e detalhe `Sympla respondeu HTTP 403.`. Portanto, a pendência não decorre do mecanismo de cron, que se encontra recuperado; é uma falha de autorização/credencial no provedor Sympla. Nenhuma dead letter foi reprocessada ou resolvida durante a auditoria.

## Atualização autorizada da credencial Sympla

Com autorização explícita do responsável, a variável sensível `SYMPLA_API_TOKEN` foi atualizada no painel da Vercel, preservando os escopos **Production** e **Preview**. O valor não é reproduzido nesta evidência. O painel confirmou a atualização e criou o deployment de Production `ABN5vkAEUpoeqbzdR4JKuoa9QsvB`, originado do commit `bea1861` de `main`; no momento do registro, seu estado era **Building**.

Nenhuma chamada de sincronização, replay ou resolução de dead letter foi realizada antes de o deployment ficar `READY`. Como a credencial foi compartilhada no canal de suporte, ela deve ser rotacionada diretamente no painel da Sympla após a validação operacional.

## Validação da sincronização após o redeploy

Com o deployment `ABN5vkAEUpoeqbzdR4JKuoa9QsvB` em estado **Ready**, uma chamada autenticada e única para `https://atleticafsa.site/api/cron/sympla-sync` retornou HTTP 200 às 18:27 UTC. A telemetria de runtime da hospedagem confirma o `GET /api/cron/sympla-sync` com status 200 no deployment novo e não identifica erros de runtime para essa rota no intervalo posterior ao teste.

O painel administrativo autenticado em `https://atleticafsa.site/admin/integracoes/sympla` também registra a execução como `SUCCEEDED`, com zero eventos lidos e sem alteração no fluxo interno. As duas dead letters antigas continuam `PENDENTE`, ambas com zero tentativas de replay e com a causa histórica `Sympla respondeu HTTP 403.`. Isso confirma que o cron e a sincronização atual estão recuperados; os registros históricos exigem replay individual e auditável para serem concluídos.

> Observação de UX/documentação: o painel acessado pelo domínio canônico de Production ainda mostra os rótulos “INTEGRAÇÕES · HOMOLOGAÇÃO” e “Limites de segurança da homologação”. Os dados são de Production; portanto, esse rótulo é uma inconsistência de interface a corrigir em alteração de código separada.

## Replay auditável das dead letters históricas

O primeiro replay individual autorizado foi concluído às 18:31 UTC. A interface mudou a ocorrência de 18/08/2026, 00:47 para `RESOLVIDA`, com uma tentativa registrada, e incluiu uma execução `SUCCEEDED` às 18:31 UTC. Essa execução consultou zero eventos e não alterou o fluxo interno. A segunda ocorrência, de 15/08/2026, 00:33, permanecia `PENDENTE` e com zero tentativas no instante imediatamente anterior ao seu replay individual autorizado.

O segundo replay individual também foi concluído com sucesso. A verificação final do painel mostra **duas de duas** ocorrências no estado `RESOLVIDA`, cada uma com exatamente uma tentativa, e duas execuções `SUCCEEDED` às 18:31 UTC. Ambas retornaram zero eventos e “Concluída sem alterações no fluxo interno”. Não restam dead letters Sympla abertas no painel de Production.

## Correção de identificação de ambiente

Foi corrigida no código a identificação estática indevida do ambiente na página administrativa da Sympla. A página agora usa `VERCEL_ENV`: em Production, exibe `INTEGRAÇÕES · PRODUÇÃO` e `Controles operacionais de produção`; em Preview e ambiente local, mantém a identificação e os limites de homologação. A mudança não altera o modo somente leitura da integração, nem seus dados ou permissões.

A regra foi coberta por dois testes unitários e verificada com `pnpm typecheck`, suíte completa (`66` arquivos aprovados; `221` testes aprovados; `3` skips intencionais) e `pnpm build` de Next.js 16.3.1. A publicação da alteração depende do fluxo automático já conectado ao `main`.

## Referências

[1]: https://vercel.com/docs/cron-jobs/quickstart "Vercel Cron Jobs Quickstart"
