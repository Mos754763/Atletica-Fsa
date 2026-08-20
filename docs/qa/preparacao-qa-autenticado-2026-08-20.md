# Preparação da QA autenticada em homologação

**Data:** 20 de agosto de 2026  
**Ambiente:** Supabase `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`)  
**Escopo:** confirmação administrativa não destrutiva dos pré-requisitos para criar identidades sintéticas de QA.

## Evidência inicial

O painel administrativo autenticado do projeto de homologação foi acessado em 20/08/2026. O projeto reportou estado **Healthy**, banco primário na região `us-east-1`, sem erros reportados no recorte operacional visível e sem branches adicionais configuradas. A verificação não exibiu, exportou ou registrou chaves, senhas, URLs de conexão ou dados de usuários.

## Limites mantidos

Esta etapa não criou usuários, não alterou tabelas, não executou SQL, não acionou cron, não enviou e-mails e não abriu checkout. Production continua fora do escopo; qualquer identidade de QA será criada apenas após confirmar uma política de nomenclatura, senha temporária, perfis necessários e posterior revogação.

## Próximo pré-requisito

Confirmar as rotas e os campos disponíveis na área de Authentication do Supabase para preparar contas sintéticas controladas por papel, evitando utilizar membros, e-mails ou senhas de Production.

## Recursos de autenticação confirmados

A área **Authentication → Users** de homologação estava disponível com mecanismo de busca e opção **Create new user**. O ambiente contém usuários pré-existentes; eles não serão modificados nem utilizados como dados de teste. A criação de uma nova identidade sintética com senha controlada será preparada separadamente, com nomenclatura exclusiva de QA, perfil mínimo e plano de revogação ao fim da validação.

O formulário administrativo confirmado permite informar e-mail e senha e marcar a confirmação automática. A opção de confirmação automática foi selecionada exclusivamente para a futura identidade sintética, de modo que a criação não dispare e-mail. Nenhum campo foi preenchido ou enviado nesta verificação.

## Identidade sintética criada

Foi criada com sucesso uma conta sintética, confirmada automaticamente e limitada ao papel padrão de cliente, exclusivamente no projeto Supabase de homologação. O identificador, o endereço de teste e a senha não foram registrados neste documento. Essa conta será usada somente para validar login por senha, sessões, rotas de cliente e negações de acesso administrativo; ela será revogada ao concluir a matriz autenticada ou antes, se o ensaio for interrompido.

## Bloqueio atual de acesso ao Preview

O formulário de login da aplicação foi alcançado inicialmente com a proteção de Preview liberada. Ao iniciar a autenticação da conta sintética, a automação do navegador excedeu o tempo de resposta e uma navegação posterior para rota protegida recebeu a tela de autenticação da Vercel. Um novo link temporário de acesso também foi direcionado à autenticação da Vercel no navegador. O comportamento está classificado como bloqueio de sessão da proteção de Preview, não como falha confirmada de credenciais da aplicação. Nenhum login de Production foi tentado e nenhum valor temporário foi registrado.

Após a autenticação interativa na Vercel, o formulário do Preview foi novamente alcançado e a tentativa com a conta sintética retornou `Email not confirmed`. O resultado confirma que a aplicação enviou a requisição ao Supabase de homologação e que a senha foi processada; a matriz autenticada permanece bloqueada somente pela confirmação de e-mail da identidade sintética. A confirmação será corrigida exclusivamente no painel de Auth do projeto de homologação e a conta seguirá sem acesso administrativo.

No perfil da identidade sintética em `Authentication > Users`, o campo `Confirmed at` está vazio e não há confirmação previamente enviada. A confirmação automática selecionada durante a criação não persistiu. Para evitar entregar mensagem a uma caixa inexistente de teste, a correção será uma atualização direta e limitada ao registro sintético no banco de homologação; nenhum usuário real será modificado.

Em seguida, o SQL Editor do mesmo projeto retornou `Error: query: Too small: expected string to have >=1 characters` tanto para a atualização limitada quanto para uma consulta `SELECT` de diagnóstico. Como a falha também ocorreu em leitura, ela foi classificada como indisponibilidade do editor/sessão, e nenhuma alteração de banco foi confirmada. O procedimento não será repetido pelo navegador até que haja uma sessão SQL funcional ou uma conexão de teste isolada.

Após a confirmação manual e limitada da identidade sintética no projeto `atletica-fsa-homolog`, o login por e-mail e senha foi aprovado no Preview isolado. A aplicação redirecionou para `/conta`, exibiu o identificador sanitizado da conta, o papel `Cliente` e somente os atalhos de cliente: loja, eventos, pedidos e segurança. Nenhuma área administrativa, pedido, inscrição, pagamento, alteração de catálogo ou outra operação de escrita foi acionada nesta etapa.

Com a mesma sessão, a navegação direta para `/admin` foi corretamente negada e devolveu a conta do cliente em `/conta?acesso=negado`. A visão permitida de eventos em `/conta/eventos` respondeu com a lista vazia esperada para a conta sintética e o atalho para explorar a agenda; nenhuma inscrição foi criada.

As rotas permitidas `/conta/pedidos` e `/conta/seguranca` também responderam corretamente. Pedidos exibiu o estado vazio e a orientação de retirada sem criar compra. Segurança exibiu o estado de primeiro fator, o provedor e-mail/senha, a indisponibilidade explícita de SMS até homologação externa e os controles de segundo fator/senha sem que qualquer atualização de credencial fosse solicitada ou enviada.

## Identidade administrativa sintética

Uma segunda identidade, destinada exclusivamente aos testes administrativos, foi criada automaticamente confirmada no mesmo projeto de homologação e sem envio de e-mail. A senha e o identificador interno não foram registrados neste repositório. O esquema atual concentra o papel em `public.profiles.role`; não há tabela `public.member_roles` nesta versão. Uma atualização idempotente, limitada à identidade sintética com domínio de teste, atribuiu o valor `admin` exclusivamente no projeto de homologação. Nenhuma permissão produtiva foi criada ou alterada.

O login por e-mail e senha da identidade administrativa foi aprovado no Preview isolado e redirecionou para `/conta`. A página identificou o papel de Administração e apresentou apenas para esse perfil os atalhos **Abrir ERP** e **Abrir ODS**.

A rota administrativa carregou o painel `/admin` com os módulos de Pedidos, Catálogo, Eventos, Relatórios, Integração Sympla, ODS e Pessoas. A sessão não executou nenhuma ação de escrita: não criou, editou, excluiu, aprovou pagamento, convidou membro, modificou produto ou alterou configuração.

Também foi validado o acesso administrativo ao `/ods`. A fila foi exibida em modo leitura com ações potencialmente mutáveis — novo pedido e confirmação de pagamento — deliberadamente não acionadas. A presença controlada dessas ações para o perfil `admin`, somada à negação prévia da rota `/admin` para a conta cliente, confirma a fronteira observável cliente–admin no Preview de homologação.

## Identidade sintética de backoffice

Foi criada uma terceira identidade com domínio exclusivo de QA, confirmação automática e senha temporária, apenas no projeto de homologação. Nenhuma mensagem foi enviada e nenhuma conta de Production foi tocada. O enum técnico não contém o valor `backoffice`; o papel operacional compatível é `cozinha`, que a aplicação apresenta ao usuário como **Backoffice**. A primeira atualização com o valor inexistente foi recusada pelo banco sem alterar registros. Em seguida, uma atualização idempotente limitada à conta sintética atribuiu `cozinha` exclusivamente no projeto de homologação.

O login por e-mail e senha desse perfil foi aprovado no Preview isolado e redirecionou para `/conta`. A interface exibiu o rótulo **Backoffice** e os atalhos permitidos `Abrir backoffice` e `Abrir ODS`, além das áreas de pedidos, eventos e segurança. Nenhuma ação de escrita, pedido, retirada, pagamento ou inscrição foi acionada durante essa verificação.

A rota administrativa para esse papel carregou a visão operacional reduzida, com a identificação `BACKOFFICE FSA / OPERAÇÃO` e somente a navegação de visão geral e ODS; os módulos administrativos de catálogo, eventos, relatórios, pessoas e integrações não foram exibidos. O acesso ao `/ods` também foi aprovado em modo leitura: a fila vazia, a atualização e os controles de novo pedido ficaram visíveis, mas não foram acionados. Isso confirma, no Preview, o escopo operacional esperado entre cliente e administrador sem criar qualquer pedido manual ou alterar status.

## Identidade sintética de Caixa

Uma quarta identidade de domínio exclusivo de QA foi criada com confirmação automática somente no projeto `atletica-fsa-homolog`. A senha, o e-mail completo e o identificador interno não foram incluídos nesta evidência. Em seguida, uma atualização SQL manual, idempotente e limitada à própria identidade sintética confirmou a atribuição do valor técnico `caixa` no campo `public.profiles.role`. Nenhuma tabela, permissão ou conta de Production foi alterada. A validação de autenticação e do escopo visível desse papel no Preview isolado está em andamento.

O formulário de login do Preview isolado recebeu as credenciais temporárias da identidade sintética e a autenticação foi submetida. Até a conclusão do redirecionamento não foi acionada nenhuma ação de escrita, transação, pedido, alteração de estoque ou pagamento.

O login foi concluído no Preview isolado e redirecionou para `/conta`. A página exibiu o rótulo **Caixa**, os atalhos pessoais de loja, eventos, pedidos e segurança, além do atalho permitido **Abrir ERP**. A sessão foi então direcionada a `/admin` exclusivamente em modo leitura. A visão carregou com navegação operacional limitada a **Visão geral**, **Pedidos**, **Relatórios** e **ODS de pedidos**; os módulos de catálogo, eventos, pessoas e integrações não foram apresentados. Nenhuma ação mutável foi acionada. A próxima verificação confirmará o comportamento de uma rota administrativa fora desse escopo.

### Bloqueio de autorização identificado

Apesar de o módulo **Catálogo** não estar exposto na navegação do papel Caixa, a navegação direta para `/admin/catalogo` carregou a página completa, inclusive formulários de criação, edição e exclusão. Nenhum formulário foi enviado e nenhum registro foi modificado. A causa foi confirmada no código: tanto a rota quanto suas nove ações server-side aceitavam indevidamente `admin` e `caixa`.

A correção local passou a restringir a rota e cada ação de mutação do catálogo exclusivamente a `admin`. O novo contrato automatizado verifica a ausência de `caixa` nos guards e contabiliza os nove guards administrativos das ações. A verificação local passou com `195` testes aprovados, `3` ignorados intencionalmente, typecheck sem erros e build de produção concluído. A correção ainda requer integração, deployment Preview e repetição da tentativa direta com a mesma conta Caixa antes de encerrar a matriz.
