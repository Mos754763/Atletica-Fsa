# Plano de publicação e validação do monitoramento de integrações

## Objetivo

Concluir a disponibilidade em produção do monitoramento semanal da integração Sympla da ATLETICA FSA, incluindo o cron `/api/cron/integration-health`, a persistência dos estados de saúde, alertas Slack de pico e recuperação, e a validação operacional segura após a publicação na Vercel.

## Estado confirmado

| Item | Situação atual |
|---|---|
| Código e migrações | Versionados no commit `f58a216` da branch `main`. |
| Banco de dados | As migrações de monitoramento e de compatibilidade do RPC foram aplicadas ao Supabase. |
| Qualidade local | `pnpm typecheck`, `pnpm test` (78 testes) e build de produção concluíram com sucesso. |
| Rotas compiladas | O build listou `/api/cron/integration-health` como rota dinâmica. |
| Produção atual | A Vercel ainda aponta para o commit anterior `a53526c`; por isso a nova rota retorna `404` em produção. |
| Tentativa de publicação | A Vercel reconheceu `f58a216`, mas o formulário de criação ficou em carregamento e não acrescentou um deployment à lista. |

## Alternativas de publicação

| Abordagem | Benefícios e trade-offs | Custo | Complexidade de configuração |
|---|---|---:|---:|
| **Publicar explicitamente o commit `f58a216` na Vercel** | Resolve a entrega atual de forma direta e permite confirmar que a versão correta chega à produção. Exige observar e tratar a falha do formulário de criação antes de repetir a solicitação. | Sem custo adicional. | Baixa. |
| **Corrigir a conexão Vercel–GitHub e deixar os próximos pushes acionarem a publicação** | Elimina a causa provável de o push na `main` não ter iniciado deployment. É o caminho mais sustentável, mas não substitui a checagem do deployment atual. | Sem custo adicional. | Média. |

> A execução combinará as duas abordagens: primeiro será publicada de forma explícita a versão validada; em seguida será verificada a integração Vercel–GitHub para que próximos commits da `main` retomem o fluxo automático.

## Etapas de execução propostas

### 1. Confirmar integridade e segurança pré-publicação

1. Conferir que `origin/main` ainda referencia `f58a216` e que não existem alterações locais não versionadas.
2. Confirmar no Supabase a presença das tabelas, índices, políticas e funções adicionadas, incluindo a remoção da sobrecarga antiga de `claim_sympla_alert`.
3. Conferir que `PAYMENTS_ENABLED` continua desativado e que nenhuma chave privada, token, segredo de cron ou credencial foi incluída em arquivos versionados, logs ou respostas.
4. Tratar a credencial de GitHub enviada pelo usuário como dado sensível: não armazená-la nem utilizá-la quando a autenticação existente for suficiente; recomendar revogação/rotação porque foi exposta na conversa.

### 2. Desbloquear e concluir o deployment da Vercel

1. Inspecionar o histórico de deployments e a configuração de Git para confirmar a branch de produção e o repositório conectado.
2. Capturar qualquer mensagem de erro ou bloqueio do formulário de criação que permaneceu em carregamento; não repetir solicitações de publicação sem entender o resultado anterior.
3. Criar ou retomar o deployment do commit exato `f58a216` com destino a produção, somente após a confirmação explícita já concedida pelo usuário.
4. Acompanhar até o status **Ready** e confirmar que o domínio `atletica-fsa.vercel.app` aponta para esse deployment.
5. Revisar a conexão Vercel–GitHub e seus gatilhos de branch para restabelecer o deploy automático a partir da `main`, caso o commit não tenha sido recebido por webhook.

### 3. Validar a nova rota de cron em produção

1. Fazer uma chamada sem credencial ao endpoint para confirmar que a rota existe e está protegida (resposta de autorização, não `404`).
2. Fazer uma única chamada autenticada com `Authorization: Bearer <CRON_SECRET>`, mantendo o segredo fora de comandos registrados, páginas, URLs e respostas.
3. Verificar a resposta sanitizada da rota: contagem de integrações, classificação de saúde, resumo de alertas e batimento registrado, sem expor detalhes de falhas sensíveis.
4. Confirmar no Supabase que a execução criou/atualizou `integration_health_states` e acrescentou o batimento de `/api/cron/integration-health` em `scheduled_route_heartbeats`.

### 4. Verificar alertas e recuperação sem gerar efeitos indesejados

1. Revisar os registros existentes de `integration_alerts` e os estados persistidos para assegurar que as chaves de deduplicação isolam corretamente cada incidente e escopo.
2. Usar apenas dados de homologação ou um cenário controlado para verificar, se necessário, o alerta de pico e a transição de recuperação; não criar dead letters artificiais no fluxo produtivo de eventos.
3. Confirmar no Slack que um incidente gera no máximo um alerta de pico por chave e que uma recuperação só é enviada após uma condição não saudável previamente persistida.
4. Documentar no procedimento operacional onde visualizar estado, batimentos, dead letters e alertas, bem como os limites de atenção e crítico.

### 5. Aceite e encerramento

1. Reexecutar as validações não destrutivas finais: tipagem, suíte de testes e build, se houver qualquer ajuste para desbloquear a publicação.
2. Registrar o commit, deployment, hora da validação, resultado do endpoint e pendências externas remanescentes.
3. Informar claramente a diferença entre: implementação concluída, migrações aplicadas, deployment publicado e teste autenticado em produção.

## Critérios de aceite

| Critério | Evidência esperada |
|---|---|
| Versão correta publicada | Vercel mostra `f58a216` como deployment de produção **Ready**. |
| Rota presente e protegida | Sem credencial, responde autorização; com credencial válida, executa a verificação. |
| Persistência operacional | Há registros coerentes em `integration_health_states` e `scheduled_route_heartbeats`. |
| Alertas seguros | Tipos de alerta aceitos, deduplicação persistente e recuperação condicionada a incidente anterior. |
| Regressão evitada | Tipagem, 78 testes e build de produção permanecem verdes. |
| Pagamentos preservados | `PAYMENTS_ENABLED` permanece `false` e não há mudança em checkout, webhook ou POS. |

## Riscos e dependências

O ponto bloqueador atual é a aceitação do deployment pela Vercel, não o código, banco ou build local. Caso a criação manual continue sem resposta, será necessário coletar a mensagem de erro no painel e revisar a integração com GitHub antes de tentar uma nova publicação. A validação autenticada depende do segredo de cron configurado exclusivamente no ambiente da Vercel. O token de GitHub compartilhado no chat não será utilizado ou preservado; como medida de segurança, deve ser revogado e substituído no GitHub pelo proprietário.

## Registro do diagnóstico

| Verificação | Resultado |
|---|---|
| `origin/main` | Aponta para `f58a216`, o commit validado para publicação. |
| Vercel — repositório Git | `Mos754763/Atletica-Fsa` aparece conectado e a integração foi estabelecida há cerca de 20 horas. |
| Vercel — histórico | O último deployment de produção listado permanece em `a53526c`; não há registro para `f58a216`. |
| Vercel — criação manual | O painel identificou o commit `f58a216` como pertencente à `main`, mas a ação de publicação permaneceu em carregamento sem criar nova linha de deployment. |
| Configuração de build | Projeto detectado como Next.js, diretório raiz vazio, instalações e build sem sobreposição manual; isso não explica o bloqueio observado. |
| Vercel — conexão Git | O repositório está ligado e os recursos de eventos de deployment e `repository_dispatch` aparecem habilitados. |
| Vercel — publicação | As opções de deployments de produção estão ativas pelo padrão da equipe; não há indicação visual de que o projeto esteja pausado. |
| Vercel — atividade | O registro lista deployments manuais e automáticos anteriores da `main`, mas nenhum evento recebido ou deployment criado para `f58a216`. |
| GitHub — branch principal | A API do GitHub confirma `f58a216` como o último commit de `main`. |
| GitHub — webhooks | A credencial já configurada para operações Git não possui escopo administrativo para listar webhooks do repositório; nenhuma credencial compartilhada em chat foi usada. |
| Alternativa de publicação | A Vercel permite criar um deployment de pré-produção apontando explicitamente para `f58a216`; se pronto, ele poderá ser validado antes da promoção controlada à produção. |
| Resolução do formulário | Após a validação assíncrona do commit, a Vercel classificou `f58a216` como `main` e disponibilizou a ação de deployment de produção. |
| Tentativa de produção | A publicação de `f58a216` foi solicitada com a confirmação prévia do proprietário; o botão permaneceu em estado de carregamento e ainda não houve criação observável do deployment. |
| Repetição solicitada | Após nova solicitação do proprietário, o formulário anterior foi encerrado sem criar deployment e o fluxo de criação foi reaberto para uma segunda tentativa controlada. |
| Resultado da repetição | A Vercel registrou um novo redeployment pronto da versão anterior, mas não exibiu `f58a216` nem o título do commit de monitoramento; a produção ainda não contém a rota nova. |
| Deploy Hook temporário | A página de Git confirma que não há hooks existentes e disponibiliza a criação de um hook nomeado, limitado explicitamente à branch `main`, conforme autorizado pelo proprietário. |
| Validação do hook | A Vercel rejeitou a primeira submissão porque `main` era apenas o placeholder do campo de branch; a correção é preencher o valor explicitamente antes de criar o hook. |
| Hook criado | O hook temporário `health-monitoring-one-time` foi criado com escopo exclusivo em `main`. Sua URL secreta não foi registrada em código, documentação, console ou repositório e será revogada após o disparo único. |
| Disparo do hook | A chamada única ao hook retornou `internal_server_error` da Vercel e não iniciou deployment observável. O próximo passo obrigatório é revogar imediatamente o hook temporário e manter a investigação pela configuração da plataforma. |
| Revogação concluída | O hook temporário foi revogado com sucesso; a página confirma que o projeto não possui Deploy Hooks ativos. Nenhuma URL secreta permaneceu configurada. |

## Registro de revisão visual posterior

| Verificação | Resultado |
|---|---|
| Loja local em tema escuro | A semântica e os controles permanecem presentes no DOM, mas a captura visual exibiu fundo escuro sem texto ou mídia legíveis. |
| Diagnóstico inicial | O CSS específico da loja usava `.dark`, enquanto o alternador global aplica `html[data-theme="dark"]`. O seletor foi alinhado e será revalidado com o bundle atualizado. |
| Comparação de tema | A mesma página renderiza normalmente em tema claro, inclusive logo, textos, imagens e carrinho. Ao retornar ao escuro, os elementos continuam ocupando espaço e acessíveis no DOM, porém o conteúdo deixa de ser visível. |
