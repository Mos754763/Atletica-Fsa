# Validação E2E — Interesse de membros em homologação

## Contexto

Ambiente de homologação: projeto Supabase `gfnbdjdqumewspvfxicl` e preview da branch `homolog/member-interest-qa-20260819`.

## Preparação do schema

Em 2026-08-19, a verificação direta no PostgreSQL confirmou a existência de `public.profiles`, `public.set_updated_at()` e `public.is_president()`. A migração-base já estava parcialmente aplicada de forma idempotente; sua reexecução encontrou somente a política já existente `profiles: user sees own profile`.

A migração antes ausente `20260819110000_member_interest_intake.sql` foi aplicada com sucesso exclusivamente em homologação. Ela criou `public.member_interest_applications`, o índice correspondente, o trigger de atualização, RLS, políticas presidenciais e grants necessários. A confirmação posterior encontrou `profiles`, `member_interest_applications`, `set_updated_at()` e `is_president()` disponíveis.

## Cenário positivo em execução

O formulário público de interesse foi aberto no preview de homologação. Os dados sintéticos preenchidos até este ponto são: nome `QA Interesse FSA 2026`, e-mail `qa.member-interest.20260819@atleticafsa.test`, WhatsApp `(00) 00000-0000`, curso `Administração de Teste` e período `3º período`. O teste ainda precisa selecionar `Esportes`, marcar o consentimento, enviar o formulário, confirmar a mensagem de sucesso e verificar a persistência no banco.

Nenhum dado de produção, preço, estoque ou configuração de pagamento foi alterado.

## Resultado positivo confirmado

O envio retornou a mensagem esperada: `Cadastro recebido. A gestão da FSA vai analisar seu interesse e entrar em contato.` A consulta direta ao banco de homologação confirmou um único registro correspondente, criado em 2026-08-19 20:32:42 UTC, com status `novo`, WhatsApp, curso e período informados e interesse `{Esportes}`.

Durante a consulta, foi confirmado que o nome correto da coluna de telefone é `whatsapp` e que os interesses são armazenados na coluna de array `interests`; trata-se de uma adequação da consulta de verificação, e não de uma falha do fluxo. O cenário de duplicidade e as proteções contra consentimento ausente e honeypot ainda serão executados antes da promoção para produção.

O formulário foi reinicializado após o cenário positivo, preservando a confirmação de sucesso já exibida. O cenário de duplicidade foi iniciado reutilizando o mesmo nome e e-mail sintéticos; ele será enviado com consentimento para confirmar que a restrição única é apresentada sem criar um segundo registro.

Os controles de consentimento e envio foram confirmados novamente no formulário reinicializado. Nenhum campo opcional foi preenchido no teste de duplicidade, pois o objetivo é isolar a validação do e-mail já cadastrado.

## Resultado de duplicidade confirmado

Com o consentimento registrado e o e-mail sintético já existente, a tela apresentou a mensagem esperada: `Seu interesse já está registrado. A gestão vai entrar em contato em breve.` O formulário retornou ao estado inicial e não indicou sucesso de um novo cadastro. A próxima verificação confirma no banco que permaneceu apenas um registro para o e-mail de QA.

A verificação posterior no banco confirmou `count(*) = 1` para o e-mail de QA e o mesmo horário de criação do cenário positivo, comprovando que a tentativa duplicada não produziu uma nova linha. O formulário foi então reposicionado e está pronto para o cenário com nome e e-mail sintéticos inéditos, mas sem marcar o consentimento.

Para o cenário de consentimento ausente, foram preenchidos somente `QA Sem Consentimento FSA` e o e-mail sintético inédito `qa.sem-consentimento.20260819@atleticafsa.test`. O consentimento permanece intencionalmente desmarcado; o envio a seguir deve ser bloqueado e não pode produzir registro no banco.

O navegador foi reposicionado ao fim da página para acessar o envio, sem interagir com o campo de consentimento. A página ainda apresenta a confirmação anterior de duplicidade, que deve ser substituída ou preservada sem gerar o novo cadastro quando o bloqueio de consentimento for acionado.

Após a recarga, o navegador preservou os dados sintéticos do cenário sem consentimento. Os campos obrigatórios de nome e e-mail estão preenchidos, a caixa de consentimento está visivelmente desmarcada e o botão `Quero participar` está disponível. O próximo clique testa exclusivamente a exigência de consentimento.

## Consentimento obrigatório confirmado

O envio com nome e e-mail válidos, mas sem a autorização marcada, foi bloqueado na própria interface com a mensagem `Confirme que podemos usar seus dados para responder ao cadastro.` A consulta posterior ao Supabase de homologação retornou `count(*) = 0` para `qa.sem-consentimento.20260819@atleticafsa.test`, comprovando que o bloqueio ocorreu antes da persistência.

## Proteção antirobô confirmada

O formulário mantém o campo oculto `company` como honeypot. A ação do servidor encerra o fluxo com resposta de sucesso antes de criar o cliente de persistência quando esse campo é preenchido. Foi adicionada uma regressão automatizada que fixa essa ordem; a suíte completa passou com **139 testes**, **3 cenários intencionalmente ignorados** e nenhum erro.

## Encerramento dos dados sintéticos

O cadastro positivo `qa.member-interest.20260819@atleticafsa.test` foi preservado para auditoria e atualizado para o status `arquivado` no Supabase de homologação. Nenhum dado de produção, preço, estoque ou configuração de pagamentos foi modificado nesta validação.
