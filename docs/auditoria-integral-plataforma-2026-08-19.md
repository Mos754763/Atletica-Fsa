# Auditoria integral da plataforma ATLETICA FSA

**Data de abertura:** 19 de agosto de 2026  
**Ambientes observados:** repositório GitHub, preview/homologação, Vercel e Supabase  
**Modo de execução:** somente leitura, testes locais e inspeções não destrutivas.  
**Exclusões expressas:** nenhuma alteração de dados ou políticas em produção, nenhum ajuste de preço/estoque, nenhuma ativação de pagamentos e nenhum envio operacional de e-mail ou webhook.

## Objetivo e critério de evidência

Esta auditoria compara a documentação, o roadmap e as declarações históricas do projeto com o código efetivamente versionado, a configuração que pode ser inspecionada e os resultados de testes reproduzíveis. Uma funcionalidade será classificada como **confirmada** somente se houver código, contrato de dados ou execução observável que a sustente. Será classificada como **parcial** quando existir interface ou modelo sem validação integral; como **pendente externa** quando depender de credencial, configuração ou decisão não disponível; e como **não comprovada** quando a documentação fizer uma afirmação sem evidência suficiente.

| Escopo de auditoria | Evidência primária | Método |
|---|---|---|
| Escopo e roadmap | `README.md`, documentos de panorama, auditorias e TODO | Comparação cronológica e por domínio |
| Código e rotas | `src/app`, `src/components`, `src/lib`, `middleware.ts` | Inventário de rotas, guardas, chamadas e testes |
| Banco e isolamento | Migrações e consulta somente leitura ao Supabase | Esquema, RLS, grants, funções, triggers e políticas |
| Identidade e RBAC | Clientes Supabase, callback, middleware e guardas | Fluxos de sessão, papéis, MFA e autorização server-side |
| Comércio e eventos | APIs, RPCs, webhooks, ODS e integrações | Estados, idempotência, estoque, QR, POS e conciliação |
| Integrações e automações | Cron, Resend, Sympla, Slack, Mercado Pago e Vercel | Configurações, autenticação, retries, alertas e logs |
| Qualidade e deploy | `package.json`, lockfile, GitHub Actions, Vercel e testes | Dependências, CI/CD, build, análise estática e segurança |

## Linha de base documental

As referências históricas indicam que, em 14 de agosto, a plataforma havia concluído a primeira geração operacional e mantinha lacunas importantes de governança, estoque transacional, automações e construtor de tabelas. O relatório atual não assumirá que essas conclusões ainda são verdadeiras: elas serão revalidadas contra as migrações e o código posteriores. A linha de base está registrada em [auditoria de escopo e prioridades](./auditoria-escopo-e-prioridades-2026-08-14.md) e [panorama da plataforma](./panorama-plataforma-atletica-fsa.md).

O estado mais recente conhecido antes desta auditoria apontava produção estável, pagamentos deliberadamente bloqueados, proteção contra abuso de cadastro de interesse promovida e uma prova de conceito de MFA TOTP limitada à homologação. Esses fatos serão confirmados em código, configuração e testes — não aceitos apenas por documentação anterior.

## Matriz de verificação

| Domínio | Status | Resultado resumido | Evidência a consolidar |
|---|---|---|---|
| Documentação, escopo e roadmap | Em análise | Inventário documental concluído; comparação pendente | Relatórios e TODO |
| Estrutura, dependências e variáveis | Em análise | Pendente de inventário técnico | `package.json`, lockfile, `.env.example`, `src/lib/env.ts` |
| Rotas e componentes | Em análise | Pendente de inventário automático | App Router e handlers |
| Auth, RBAC e multitenancy | Em análise | MFA nativo validado em homologação; isolamento completo pendente | Guardas, perfis, RLS |
| Banco, RLS, grants e funções | Em análise | Pendente de comparação entre migrations e schema vivo | SQL e consultas de catálogo |
| Catálogo, pedidos, estoque e ODS | Em análise | Pendente de rastreio ponta a ponta | Rotas, RPCs e testes |
| Eventos, QR e Sympla | Em análise | Pendente de rastreio ponta a ponta | Rotas, jobs e dead letters |
| Mercado Pago, POS e webhooks | Em análise | Pendente de revisão de assinatura, idempotência e gate | Webhooks, testes e variáveis |
| E-mail, automações, cron e alertas | Em análise | Pendente de revisão de segurança e saúde | Resend, Vercel, Slack, heartbeats |
| CI/CD, deploy e observabilidade | Em análise | Pendente de inspeção de workflows e deploy | GitHub Actions, Vercel e logs |

## Escala de severidade

| Nível | Definição | Tratamento esperado |
|---|---|---|
| P0 — crítico | Permite exposição de dados, perda financeira, bypass de autorização ou indisponibilidade operacional grave | Corrigir antes de promover qualquer alteração para produção |
| P1 — alto | Risco relevante em domínio administrativo, integridade de pedido, dados pessoais ou operação | Planejar correção no próximo ciclo controlado |
| P2 — médio | Cobertura incompleta, observabilidade insuficiente ou comportamento inconsistente sem exploração direta identificada | Incluir no backlog priorizado com critério de aceite |
| P3 — baixo | Dívida de documentação, UX, padronização ou melhoria defensiva | Registrar e resolver sem bloquear a operação atual |

## Registro de evidências

As próximas seções serão preenchidas com achados reproduzíveis, indicando arquivo, rota, migração, consulta ou resultado de teste. Segredos, tokens, senhas, URLs de callback privadas e dados pessoais não serão reproduzidos neste documento.

### Inventário versionado inicial

O repositório na branch `homolog/auth-security-poc-20260819` contém **74 documentos Markdown**, **32 migrações SQL**, **23 páginas App Router**, **11 handlers HTTP** e **46 arquivos de teste**. Há uma única automação CI versionada em `.github/workflows/ci.yml`. A busca por arquivos versionados com extensões típicas de ambiente ou chave (`.env`, `.pem`, `.key`) não retornou resultados; os nomes relacionados a segredo encontrados são apenas testes, recuperação de senha e tokens opacos de retirada.

| Superfície | Inventário observado | Observação inicial |
|---|---:|---|
| Páginas App Router | 23 | Inclui áreas públicas, conta, ERP, ODS, administração e MFA em homologação |
| Handlers HTTP | 11 | Checkout, webhooks, exportação, ODS, configuração pública e quatro cron jobs |
| Migrações | 32 | Cobrem núcleo, governança, comércio, eventos, CRM, Sympla, saúde e interesse de membros |
| Testes | 46 arquivos | Cobrem domínio, integração simulada, rotas críticas, configurações e regressões conhecidas |
| Dependências de produção | 15 | Supabase, Next, Mercado Pago por HTTP, Resend, PDF, QR, `pg`, imagem e validação |
| CI versionada | 1 workflow | Tipagem, testes e build para `push` e PR em `main`; demais controles serão auditados em fase própria |

O contrato central de runtime está concentrado em `src/lib/env.ts`. Ele declara variáveis públicas do aplicativo e Supabase, além das chaves privadas de Supabase, Resend, Mercado Pago, cron, proteção antiabuso, Sympla e Slack. A coleta de valores foi deliberadamente excluída da auditoria; a verificação de presença e escopo por ambiente será feita com metadados do provedor, sem registrar segredos.

### Rotas, autenticação e autorização — evidências iniciais

A aplicação possui defesa em camadas. O middleware apenas renova a sessão SSR; as páginas operacionais usam guardas explícitas. `requireRole()` obtém o identificador em `auth.getClaims()`, lê `profiles.role` no servidor e registra tentativas negadas por RPC antes de redirecionar. `requirePresident()` adiciona a exigência de `profiles.is_president`; o shell administrativo combina papel operacional, Presidência, diretoria de setor e grants de tabelas antes de instanciar o cliente com privilégio de serviço.

| Superfície | Controle confirmado | Observação de auditoria |
|---|---|---|
| `/erp` e `/ods` | `requireRole([admin, caixa, cozinha])` | O valor persistido continua sendo `cozinha`; a apresentação traduz o papel para **Backoffice**. Isso é compatível, mas deve ser tratado como legado de domínio e não renomeado sem migração coordenada. |
| `/admin/*` | `AdminLayout` chama `requireAdminShell()` | O layout protege páginas filhas por herança; a leitura de grants e diretoria ocorre após validar a sessão e o perfil. |
| Ações administrativas | `requireRole`, `requirePresident` ou `requireAdminShell` | As mutações catalogadas nos módulos de atividades, automações, catálogo, eventos, membros, organização e tabelas apresentam uma guarda antes do uso de privilégios elevados. |
| APIs de checkout, ODS e exportação | Bearer token validado em `getApiProfile()` | O helper valida o token no Supabase e carrega o papel da tabela `profiles`; as rotas ODS utilizam cliente autenticado para chamar RPCs, em vez de efetuar transições com service role. |
| Inscrição de evento | Sessão SSR, leitura do perfil e RPC atômica | A ação associa a inscrição ao chamador no banco por `auth.uid()`; o e-mail é disparado somente após o retorno de registro válido. |

Não foi encontrado um modelo de **multi-tenancy** materializado por `tenant_id`, organização, workspace ou conta nas entidades ou migrações. As quatro referências textuais encontradas foram falsos positivos de texto de UI/CSS e campo de formulário. O sistema é, portanto, uma aplicação de **organização única** (ATLETICA FSA), com isolamento entre usuários, setores e registros próprios, mas não entre organizações independentes. Esse fato é arquiteturalmente coerente com o escopo atual, porém se torna um bloqueio de produto caso o roadmap passe a contemplar múltiplas atléticas ou clientes SaaS.

### APIs de negócio e superfícies públicas

O endpoint público `/api/public-config` expõe apenas URL e chave **publicável** do Supabase, sem cache. Esse material é inerentemente público para clientes Supabase e não constitui, por si só, vazamento de segredo; sua segurança depende de RLS e de não expor a chave de serviço. O callback OAuth aplica `resolveSafeRedirectPath()` antes da troca de código e devolve erro controlado quando a configuração ou a troca falham.

Checkout e retomada exigem Bearer token válido. A retomada acrescenta o filtro `customer_id = auth.profile.id`, impedindo a consulta de pedido alheio por UUID. A criação valida limites de carrinho, obtém a reserva por RPC sob token do usuário e tenta compensar com `cancel_checkout_order` caso a criação da preferência externa falhe. O ODS limita leitura, atualização e pedido manual aos papéis operacionais e delega confirmações sensíveis a RPCs autenticadas, incluindo QR opaco de retirada e pagamento presencial.

| ID | Severidade preliminar | Evidência | Impacto | Recomendação |
|---|---|---|---|---|
| API-01 | Média | `csvCell()` escapa aspas, vírgulas e quebras de linha, porém não neutraliza valores que iniciam com `=`, `+`, `-` ou `@`. | Uma célula controlada por usuário pode ser interpretada como fórmula ao abrir CSV em planilha. | Prefixar campos textuais que comecem com caracteres de fórmula por apóstrofo, tanto em CSV como no XML do XLSX, e acrescentar teste de regressão. |
| API-02 | Baixa | A exportação de clientes, vendas e eventos exige `admin`, mas não há evidência nesta rota de log específico de exportação. | Reduz rastreabilidade LGPD de extração de dados pessoais por administradores legítimos. | Registrar um evento no CRM/audit log com ator, dataset, período, formato e resultado, sem armazenar o conteúdo exportado. |

### Banco de dados, RLS, funções e integridade — produção

A inspeção foi executada exclusivamente com `SELECT` no banco de produção. Foram identificadas **47 tabelas** no schema `public`; todas têm RLS habilitado. Não existem constraints não validadas nem triggers de negócio desabilitados. A maior parte das tabelas tem ao menos uma política explícita e chaves primárias; o modelo de integridade usa chaves estrangeiras, `CHECK`, `UNIQUE`, funções RPC e travas transacionais nas jornadas de pedido, ingresso e retirada.

Quatro tabelas possuem RLS ativado sem políticas: `member_interest_abuse_events`, `member_interest_rate_limits`, `payment_webhook_events` e `table_name`. Nas duas primeiras, apenas `service_role` possui grants, o que é coerente com telemetria antiabuso interna. Nas duas últimas, `anon` e `authenticated` ainda detêm grants de tabela, mas RLS sem policy resulta em negação padrão no acesso direto. A tabela preexistente `table_name` tem zero linhas, RLS sem policy, estrutura genérica (`id`, timestamps, `data`, `name`) e não aparece nas migrações versionadas: trata-se de artefato ocioso que merece uma migração de descarte **apenas após backup e aprovação explícita**, não uma exclusão manual durante a auditoria.

| ID | Severidade preliminar | Evidência de produção | Impacto | Correção recomendada |
|---|---|---|---|---|
| DB-01 | **Crítica** | `claim_email_outbox(p_limit integer)` é `SECURITY DEFINER`, retorna `SETOF email_outbox`, tem `search_path=public`, não contém guarda de identidade/papel e `anon` possui `EXECUTE`. | Uma chamada RPC pública potencialmente pode reivindicar e ler itens da caixa de saída de e-mail, inclusive destinatários e corpo, além de alterar o estado de envio. | Revogar `EXECUTE` de `PUBLIC`, `anon` e `authenticated`; conceder somente a `service_role`/papel interno necessário. Executar teste de regressão de worker após a correção. |
| DB-02 | **Crítica** | `settle_paid_event_ticket(...)` é `SECURITY DEFINER`, aceita execução por `anon`, não contém guarda de identidade/papel e realiza liquidação de inscrição. | Uma chamada direta de RPC pode contornar o webhook e tentar alterar o estado de pagamento de ingresso. | Revogar execução pública e manter a função apenas para `service_role`; acrescentar teste que comprove `403`/negação para anon e authenticated. |
| DB-03 | Alta | `expire_stale_email_outbox()` é `SECURITY DEFINER`, sem guarda interna e executável por `anon`. | Terceiros podem tentar acionar expiração de jobs de e-mail. | Restringir `EXECUTE` a `service_role`/worker interno e testar o cron autorizado. |
| DB-04 | Média | 23 funções `SECURITY DEFINER` possuem execução por `PUBLIC`; todas fixam `search_path`, mas a menor permissão não é aplicada de modo uniforme. | A superfície pública é maior que o necessário e aumenta risco de regressão futura, inclusive para funções trigger. | Revisar por função, preservar somente helpers deliberadamente públicos com validação interna e revogar chamadas públicas de funções de trigger, worker, liquidação e manutenção. |
| DB-05 | Média | Não há ledger de migrações da aplicação no banco (`supabase_migrations.schema_migrations` não existe); apenas catálogos internos `auth`, `realtime` e `storage`. | A equivalência entre as 32 migrações Git e o banco não pode ser provada diretamente por histórico aplicado. | Implantar fluxo `supabase db push`/CLI ou registrar uma tabela de controle de migrações com checksum no próximo ciclo de governança. |

> O achado DB-01 não foi explorado por RPC e nenhum dado de e-mail foi lido. A classificação decorre da combinação verificável de `SECURITY DEFINER`, retorno `SETOF email_outbox`, concessão para `anon` e ausência de uma guarda textual de identidade ou papel.

### Integrações, cron, alertas e observabilidade — produção

O gateway de pagamentos permanece bloqueado por configuração de aplicação, e não existem eventos em `payment_webhook_events`; isso é coerente com a decisão vigente de não habilitar pagamentos reais antes de homologação. A fila `email_outbox` e a tabela de entregas `email_deliveries` também não possuem registros. Portanto, o código de envio e as configurações de Resend existem, mas a auditoria não encontrou evidência persistida de entrega de e-mail transacional via essa fila em produção. Essa constatação não abrange os e-mails de autenticação do Supabase, que seguem fluxo próprio.

| Componente | Evidência observada | Classificação |
|---|---|---|
| Sympla | Integração habilitada, modo `read_only`, última sincronização com estado `succeeded` em 19/08; 28 execuções bem-sucedidas e 2 falhas históricas | Parcialmente saudável |
| Dead letters Sympla | Há 2 itens não resolvidos na fase `fetch_events`, com código agregado `sympla_sync_failed`, originados entre 15/08 e 18/08 | Atenção operacional |
| Alertas de integração | 4 alertas com status `sent`, gerados de 15/08 a 18/08 | Confirmado; canal de alerta já foi acionado |
| Cron de lembretes | Último heartbeat observado: `succeeded` em 19/08 | Confirmado |
| Cron de sincronização Sympla | Último heartbeat observado: `succeeded` em 19/08 | Confirmado |
| Cron de health check | Último heartbeat observado: `succeeded` em 17/08; estado agregado continua `critical` | Requer correção de monitoramento |
| Mercado Pago | Nenhum webhook persistido; pagamentos deliberadamente bloqueados | Esperado enquanto `PAYMENTS_ENABLED=false` |

| ID | Severidade preliminar | Evidência | Impacto | Correção recomendada |
|---|---|---|---|---|
| INT-01 | Média | `integration_health_states.cron_routes` permanece `critical` apesar de existir heartbeat de sucesso para `/api/cron/integration-health`. A métrica registrada pelo health check não enxerga a própria execução no momento da coleta. | O painel pode sinalizar incidente inexistente e gerar alertas desnecessários. | Ao avaliar o próprio cron, usar o último heartbeat anterior ou gravar o heartbeat de início antes da análise; acrescentar teste de recuperação automática no ciclo seguinte. |
| INT-02 | Média | `integration_health_states.sync` permanece `critical` e há 2 dead letters Sympla abertas há mais de 24 horas, embora a sincronização mais recente tenha sucedido. | Falhas antigas continuam contaminando a saúde e podem ocultar a distinção entre incidente ativo e backlog de reprocessamento. | Reprocessar ou encerrar os itens após análise da causa; calcular saúde com idade, recorrência e último sucesso, expondo claramente o backlog. |
| INT-03 | Média | As tabelas `email_outbox` e `email_deliveries` estão vazias. | Não há evidência de entrega transacional pelo worker próprio, nem teste de observabilidade do ciclo completo de e-mail. | Executar, em homologação, um envio controlado com destinatário externo e verificar `email_outbox`, `email_deliveries`, id do provedor e tratamento de falha. |

Na Vercel, a revisão de produção atual é `dpl_BwL4e1FvxTz1JP58nPH8tmZQnC6P` (commit `5ef9657`, estado `READY`). Nas últimas 24 horas ela registrou respostas bem-sucedidas e nenhuma falha de aplicação agrupada na consulta específica da revisão. A telemetria agregada de sete dias, porém, contém seis grupos de erro em deploys anteriores: configuração Supabase pública/privada ausente, validação de slug na criação de tabela, export inválido em arquivo `use server`, ausência transitória de tabela de interesse de membros e ambiguidade SQL de `registration_id`. Como os grupos apontam para revisões anteriores à produção atual, eles não devem ser tratados como falhas ativas sem reprodução; devem permanecer como regressões já conhecidas a serem cobertas por testes de implantação.

O comando `pnpm audit --prod` foi executado nesta revisão e retornou **zero vulnerabilidades conhecidas**.

### CI/CD e governança de repositório

O único workflow versionado, `Continuous Integration`, executa em `push` e `pull_request` para `main`, com permissão mínima `contents: read`, concorrência cancelável e timeout de 15 minutos. O job executa instalação imutável (`pnpm install --frozen-lockfile`), tipagem, testes e build. Os 20 runs mais recentes no GitHub foram concluídos com sucesso, incluindo o commit de produção `5ef9657`.

O repositório é privado e permite merge commit, squash e rebase; também mantém issues e projetos habilitados. A API de proteção de branch retornou que esse controle exige GitHub Pro ou repositório público no plano atual, portanto não foi possível comprovar uma exigência técnica de aprovação ou de status check para `main`. A ausência de `SECURITY.md` no repositório foi confirmada pelos metadados de GitHub.

| ID | Severidade preliminar | Evidência | Impacto | Correção recomendada |
|---|---|---|---|---|
| CICD-01 | Média | Não há proteção de branch verificável para `main` no plano atual e a automação CI só é acionada para `main`, não para as branches de homologação. | Um commit direto em `main` pode ignorar revisão humana; alterações em homologação dependem de validação local/Vercel, sem check obrigatório do GitHub. | Adotar processo de PR obrigatório; quando viável, habilitar branch protection ou rulesets. Enquanto isso, bloquear promoção operacional a `main` sem run CI verde documentado. |
| CICD-02 | Baixa | O repositório não possui `SECURITY.md` nem um procedimento versionado de relato e triagem de vulnerabilidades. | Diminui a clareza de resposta para incidentes e achados de segurança. | Incluir política mínima de segurança, canal de reporte e tempos de triagem; vincular ao backlog de governança. |

### Configuração de deploy e superfície pública Vercel

O projeto Vercel `prj_9jUz7HbIbzZdMgB3BcNd1GmUUFn2` está identificado como Next.js, Node 24.x, com domínios `atleticafsa.site`, `www.atleticafsa.site`, `atletica-fsa.vercel.app` e domínios automáticos de projeto/branch. A última revisão observada estava em estado `READY`.

A proteção observada é SSO/Vercel Authentication habilitada para todos os deployments exceto domínios customizados. Portanto, previews gerados com domínio automático exigem autenticação, enquanto os domínios customizados atendem ao público. Proteção por senha e allowlist de IP não estão habilitadas. Isso é coerente com a necessidade de landing pública, mas exige confirmar que previews não recebem credenciais de produção ou que recebem somente configuração homologada.

Não há ferramenta de leitura de Environment Variables exposta pelo conector atual e o CLI Vercel não está instalado no ambiente de auditoria. Por segurança, a revisão confirmou o **contrato versionado** de variáveis em `src/lib/env.ts`, mas não enumerou nem revelou valores ou nomes efetivamente configurados na Vercel. A verificação de paridade de nomes entre Production e Preview permanece uma pendência de acesso administrativo na Vercel.

| ID | Severidade preliminar | Evidência | Impacto | Correção recomendada |
|---|---|---|---|---|
| DEPLOY-01 | Média | Previews são autenticados, mas domínios customizados não; não foi possível comprovar a segmentação real de variáveis por ambiente sem acesso à lista de nomes. | Se um preview receber variáveis de produção, poderia operar contra produção ou processar integrações reais. | Conferir no painel Vercel, por nome e ambiente, que `PAYMENTS_ENABLED=false` em Production e Preview, e que Preview aponta exclusivamente para Supabase de homologação e chaves de teste. |

### Testes estáticos, build e amostragem de rotas de produção

A revisão em árvore limpa executou `pnpm typecheck`, `pnpm test` e `pnpm build` com sucesso. A suíte registrou **45 arquivos aprovados, 1 arquivo intencionalmente ignorado, 150 testes aprovados e 3 ignorados**. O aviso da API CJS do Vite foi emitido durante a execução dos testes, mas não causou falha. O build Next.js 16.3.1 compilou e listou 31 superfícies de rota (páginas, handlers e middleware) sem erro de tipagem ou de empacotamento.

Uma amostragem HTTP não autenticada contra `https://atleticafsa.site` confirmou `200` para `/`, `/loja`, `/eventos`, `/login`, `/redefinir-senha` e `/api/public-config`; e `307` para `/conta`, `/erp`, `/ods` e `/admin`, todos direcionando ao login. As páginas extensas `/` e `/loja` enviaram cabeçalho 200, mas excederam a janela de leitura de 15 segundos ao baixar o HTML completo; isto não é prova de indisponibilidade, porém deve ser acompanhado por métrica de performance real.

O caminho `/conta/seguranca` retornou `404` em produção. A rota existe, compila e foi validada na branch de homologação `homolog/auth-security-poc-20260819`, mas ainda não foi promovida para `main`; logo, o retorno 404 é uma diferença de release conhecida, não uma rota quebrada da revisão de produção atual.

| ID | Severidade preliminar | Evidência | Impacto | Correção recomendada |
|---|---|---|---|---|
| RELEASE-01 | Informativa | `/conta/seguranca` está somente em homologação e devolve 404 em produção. | O Centro de Segurança e MFA TOTP não estão disponíveis para usuários de produção. | Promover somente após aprovar o plano de autenticação e repetir o roteiro de homologação; não criar link de produção antes da promoção. |
| PERF-01 | Baixa | HTML de `/` e `/loja` ultrapassou 15s em descarga completa na amostragem de rede, embora tenha respondido 200. | Pode indicar HTML inicial pesado ou limitação transitória de rede; não há evidência suficiente para classificar como incidente. | Medir TTFB, LCP e tamanho de resposta pelo Web Analytics/Vercel Speed Insights antes de qualquer otimização. |

Uma comparação adicional de metadados apontou **47 tabelas públicas com RLS em produção** e **46 em homologação**, enquanto ambos os ambientes possuem 23 funções `SECURITY DEFINER` executáveis por `PUBLIC`. A diferença foi enumerada: a única tabela exclusiva de produção é `public.table_name`, o artefato vazio já classificado acima. Não há, nesta dimensão, diferença funcional entre os modelos de negócio dos dois ambientes; ainda assim, o artefato deve ser tratado em uma migração controlada e com backup, nunca por intervenção manual em produção.

## Comparação entre roadmap e entrega observada

O roadmap descreve uma plataforma integrada para uma única organização, com vitrine pública, catálogo, pedidos, ODS, ERP, eventos, CRM, automações, integrações e governança. A comparação abaixo não usa a existência de interface como prova isolada: marca como **confirmado** somente o que possui ao menos código, contrato de dados e teste ou observação operacional; como **parcial** o que existe, mas depende de validação ponta a ponta; e como **pendente** o que está bloqueado por configuração externa, decisão de negócio ou correção de segurança.

| Domínio do roadmap | Estado aferido | Evidência técnica observada | Lacuna ou condição para aceite |
|---|---|---|---|
| Landing, identidade visual e página institucional | Confirmado no código | Rotas públicas compilam, landing responde 200 e há componentes institucionais, de marca e de interesse de membros. | Performance real da landing e da loja ainda requer medição de RUM/LCP; a amostragem HTTP não substitui teste de navegação em dispositivos reais. |
| Loja, catálogo e CMS | Parcialmente confirmado | Rotas `/loja`, administração de catálogo, exportação, variações, imagens e atualização administrativa estão presentes; checkout tem autenticação, reserva e compensação. | A exportação CSV/XLSX precisa neutralizar fórmula; não houve ensaio completo de compra aprovada por gateway. |
| Mobile Order & Pay e Mercado Pago Checkout Pro | Implementado, porém **deliberadamente não liberado** | Código de criação/retomada de checkout, webhook HMAC, idempotência e modelo de pedidos existem; `PAYMENTS_ENABLED` permanece bloqueado e nenhum webhook foi registrado em produção. | Requer cenário sandbox completo, confirmação de credenciais/URLs por ambiente e aprovação explícita antes de qualquer liberação. |
| Mercado Pago Point/POS | Não comprovado como operacional | Há planejamento, modelos e referências de integração no repositório, mas a auditoria não encontrou evidência operacional de ordem Point, webhook real ou conciliação. | Homologar credenciais, terminal, idempotência e ciclo de webhook com dados sandbox antes de considerar entregue. |
| ODS e operação de pedidos | Confirmado no código; validação operacional parcial | `/ods` e API de pedidos são protegidas por papel, com criação manual, transições controladas, retirada por QR e fluxos de pagamento presencial. | Executar ensaio multiusuário de pedido manual, retirada e estados concorrentes no ambiente de homologação atual. |
| ERP, RBAC, setores e governança | Confirmado no código | Layout administrativo protegido, papéis, Presidência, diretoria de setor, grants de tabelas, CRM e construtor de tabelas estão presentes. | O papel persistido `cozinha` continua legado interno com rótulo Backoffice; sua alteração exige migração coordenada. A ausência de multi-tenancy é intencional para uma única atlética. |
| Construtor de tabelas | Confirmado no código e banco | Migrations, grants, ações administrativas e páginas `/admin/tabelas` existem. | Validar em homologação os limites de volume, importação/exportação e a jornada de operador não técnico; as falhas históricas de slug devem continuar cobertas por teste de deploy. |
| Eventos, ingressos, QR e check-in | Parcialmente confirmado | Eventos, lotes, inscrições, check-in atômico, QR opaco e integração Sympla possuem modelos, RPCs e testes; ingresso gratuito já foi homologado historicamente. | A liquidação de ingresso pago tem risco crítico enquanto `settle_paid_event_ticket` for executável publicamente; bloquear promoção de pagamento até corrigir DB-02. |
| Integração Sympla | Parcialmente saudável | Cron, sync, dead letters, alertas e painel existem; último sync foi bem-sucedido. | Há duas dead letters abertas e estado de health crítico; reprocessar/encerrar com causa e corrigir o cálculo de saúde antes de declarar estabilidade. |
| CRM, trilha de atividade e e-mail | Parcialmente confirmado | Modelos de atividade, outbox, automações e Resend estão implementados. | Não há registros de entrega transacional na fila de produção; realizar ensaio controlado em homologação e reforçar a função privilegiada da outbox. |
| LGPD, consentimento e interesse de membros | Confirmado com ressalva legal | Formulário possui consentimento combinado, validação, honeypot, rate limit e retenção; métricas são restritas à Presidência. | Os textos de termos demandam revisão jurídica antes de publicação como instrumento legal definitivo. |
| MFA, provedores sociais e segurança de conta | Parcial em homologação | Centro de Segurança e TOTP foram implementados e testados em branch de homologação; autenticação atual usa Supabase e RBAC existente. | Não promovido para produção; Microsoft, Apple e SMS dependem de credenciais, fornecedor, CAPTCHA e decisão de custo. |
| Observabilidade, alertas e cron | Parcialmente confirmado | Heartbeats, estados de saúde, alertas Slack e logs de integração existem. | O próprio health check se autoavalia como crítico; corrigir INT-01 e resolver backlog Sympla para eliminar alertas falsos e estado degradado. |
| CI/CD e promoção segura | Parcialmente confirmado | GitHub Actions executa tipo, testes e build; últimos runs foram verdes; deploy atual está pronto. | Não há proteção técnica de branch comprovável, nem CI obrigatório em branches de homologação. Adotar processo de PR com evidência de run verde e política de segurança. |

### Conclusão de aderência ao escopo

A plataforma **não é apenas um protótipo visual**: há evidências de aplicação integrada, persistência, RLS, autorização por papel, operações administrativas, catálogo, eventos, cron e observabilidade. Contudo, ela também **não está pronta para liberar pagamentos reais nem para ser classificada como integralmente homologada**. Os bloqueadores objetivos são os privilégios excessivos de funções de banco identificados em DB-01 e DB-02, a ausência de ensaio de pagamento aprovado, as dead letters/saúde da Sympla, a falta de evidência de e-mail transacional por outbox e a verificação incompleta da separação de variáveis Vercel entre preview e produção.

O multi-tenancy solicitado na auditoria não existe e não é parte do escopo operacional observado: a ATLETICA FSA é modelada como uma organização única. Isso não é vulnerabilidade no cenário atual, mas deve ser convertido em requisito arquitetural explícito antes de vender a plataforma para outras atléticas ou operar múltiplas entidades independentes.

## Matriz de priorização e plano corretivo

Nenhuma correção foi aplicada durante esta auditoria. A sequência abaixo foi desenhada para remover primeiro os caminhos de maior privilégio e preservar o bloqueio de pagamentos. Mudanças de banco devem ser feitas por migração versionada, primeiro em homologação, com teste positivo do worker autorizado e teste negativo para `anon` e `authenticated`; a aplicação em produção requer aprovação explícita e janela controlada.

| Prioridade | Item | Ação verificável | Responsável proposto | Critério de aceite e reversão |
|---|---|---|---|---|
| **P0** | DB-01 — outbox exposta | Revogar `EXECUTE` público de `claim_email_outbox(integer)` e conceder somente ao papel interno de worker. | Engenharia + Presidência para aprovar produção | RPC negada para `anon` e `authenticated`; worker continua a reivindicar mensagem. Reversão: restaurar apenas o grant interno anterior, nunca `PUBLIC`. |
| **P0** | DB-02 — liquidação de ingresso exposta | Restringir `settle_paid_event_ticket(...)` a `service_role` ou a função webhook estritamente autenticada. | Engenharia + Presidência | Tentativa direta sem credencial privilegiada é negada; teste sandbox do webhook ainda liquida inscrição válida. Reversão por grant interno limitado. |
| **P0** | Gate financeiro | Manter `PAYMENTS_ENABLED=false` em produção até os P0, credenciais de ambiente e ensaio de aprovação serem concluídos. | Presidência | Conferência visual por nome/ambiente na Vercel; nenhuma preferência produtiva ou webhook de pagamento processado. |
| **P1** | Funções privilegiadas restantes | Revisar as 23 funções `SECURITY DEFINER`; aplicar menor privilégio e documentar cada função deliberadamente pública. | Engenharia de dados | Matriz função × role versionada; sem `PUBLIC` em triggers, manutenção, liquidação ou workers. |
| **P1** | Saúde Sympla | Corrigir autoavaliação de cron, examinar as duas dead letters e registrar a resolução/reprocessamento. | Operações de eventos | Estado `healthy` após sucesso recente, sem alertas falsos e backlog classificado. |
| **P1** | Variáveis e ambientes | Conferir no painel Vercel nomes e escopo por ambiente, sem copiar valores para repositório ou relatório. | Administrador Vercel | Preview usa Supabase/chaves sandbox; Production usa produção; `PAYMENTS_ENABLED=false` em ambos enquanto houver homologação. |
| **P1** | E-mail transacional | Executar em homologação um envio controlado, verificar outbox, delivery, ID do provedor e falha simulada. | Operações + Engenharia | Evidência sem dados pessoais no relatório e teste automatizado do worker. |
| **P2** | Exportação | Neutralizar fórmulas em CSV e XLSX e registrar auditoria de exportação. | Engenharia | Testes para valores iniciados por `=`, `+`, `-` e `@`; trilha sem conteúdo sensível. |
| **P2** | Governança de migrações | Implantar ledger/checksum de migrations e registrar a eliminação aprovada de `public.table_name`. | Engenharia de dados | Histórico aplicado comprovável; backup e migration reversível/arquivável para o artefato. |
| **P2** | Governança de entrega | Padronizar PR, evidência de CI verde para promoção e `SECURITY.md`. | Presidência + Engenharia | Checklist de release obrigatório e política de relato de vulnerabilidade versionada. |
| **P3** | Performance e UX operacional | Medir RUM/LCP, validar formulários operacionais e cobrir regressões históricas de deploy. | Produto + Engenharia | Baseline de métricas e cenários de aceite por jornada. |

### Limites de evidência e itens que exigem validação manual

Esta revisão verificou código versionado, configuração que o conector expõe, metadados de deployment, consultas de catálogo e contagens agregadas, além de testes locais. Ela não leu valores de segredos, corpos de e-mail, dados pessoais, conteúdo de pedidos, tokens, payloads de dead letters ou chaves de integração. Também não enviou pagamentos, e-mails ou webhooks de produção. Consequentemente, a auditoria não certifica entrega financeira, entrega de e-mail nem configuração efetiva de cada variável de ambiente; ela classifica esses itens como pendências com roteiro de validação seguro.

> **Decisão de segurança:** os achados P0 bloqueiam qualquer ativação de pagamento real, liquidação de ingresso pago ou ampliação de automações que dependam das funções afetadas. A plataforma pode continuar com fluxos já bloqueados e rotinas não financeiras, desde que as variáveis de ambiente permaneçam segmentadas e os alertas sejam acompanhados.

## Referências de evidência

[1]: ./auditoria-escopo-e-prioridades-2026-08-14.md "Linha de base de escopo e prioridades"  
[2]: ./panorama-plataforma-atletica-fsa.md "Panorama operacional da plataforma"  
[3]: ../src/lib/env.ts "Contrato versionado de ambiente"  
[4]: ../vercel.json "Agendamentos Vercel versionados"  
[5]: ../supabase/migrations "Migrações SQL versionadas"  
[6]: ../.github/workflows/ci.yml "Workflow Continuous Integration"  
[7]: ./validacao-auth-homologacao-2026-08-19.md "Evidências da prova de conceito de MFA em homologação"
