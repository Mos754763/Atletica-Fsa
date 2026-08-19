# Validação de homologação — proteção contra abuso

**Ramo:** `homolog/member-interest-abuse-rate-limit-20260819`  
**Commit candidato:** `5b40f01`  
**Preview:** https://atletica-fsa-git-ho-dd2d20-moises-faustino-rodrigues-s-projects.vercel.app/  
**Deployment:** `dpl_7SbmAkgKXL7H2LNbHyhzonL25jLu` — `READY`

## Evidência inicial

A landing do Preview respondeu normalmente e exibiu a seção pública **VEM PRA FSA**, incluindo o formulário de interesse, o campo honeypot visualmente oculto `Empresa`, o campo de e-mail e o consentimento explícito.

O formulário permaneceu acessível durante o reposicionamento pela âncora `#participar`; nenhum erro de carregamento foi exibido antes dos cenários funcionais.

Para o cenário de validação combinada, foram preenchidos dados sintéticos de nome (`QA Validação Conjunta FSA`) e e-mail inválido (`email-invalido`), mantendo o consentimento LGPD desmarcado. O envio ainda será registrado com a mensagem resultante e a evidência correspondente no banco de homologação.

## Cenários planejados

1. Envio válido com e-mail sintético.
2. E-mail inválido e consentimento ausente, com retorno combinado de validação.
3. Honeypot preenchido, sem criação de interesse e com evento minimizado.
4. Décima primeira tentativa de um mesmo identificador de rede na janela horária, com bloqueio e evento `rate_limited`.
5. Consulta agregada das métricas administrativas e retenção de eventos expirados.

## Resultado — validação combinada

O envio com o e-mail sintético inválido e o consentimento desmarcado retornou, pela interface do Preview, a mensagem combinada esperada: `Informe um e-mail válido. Confirme que podemos usar seus dados para responder ao cadastro.`

Na confirmação direta no Supabase de homologação, o evento `validation_rejected` passou a totalizar `1` e a busca por `email-invalido` em `member_interest_applications` retornou `0` linhas. Portanto, o bloqueio registrou telemetria e não persistiu cadastro de interesse.

## Resultado — cadastro válido e contador de taxa

Um cadastro sintético válido foi enviado pela interface do Preview com consentimento confirmado e interesse em `Esportes`. A interface retornou: `Cadastro recebido. A gestão da FSA vai analisar seu interesse e entrar em contato.`

A verificação no Supabase de homologação encontrou o registro `5fcfbd3d-44c4-4040-a53c-a1b6c15522c9`, com estado `novo` e interesses `{Esportes}`. A tabela `member_interest_rate_limits` possuía `2` buckets com hash de IP no momento da leitura, demonstrando que o consumo de janela também ocorreu. O registro será arquivado na etapa de limpeza de QA.

## Resultado — limitação de taxa

Para reproduzir a décima primeira tentativa na mesma janela de uma hora, o bucket de IP exclusivamente de homologação foi preparado com `attempt_count = 10`. A submissão seguinte pela interface do Preview retornou exatamente: `Muitas tentativas deste acesso. Aguarde uma hora antes de enviar novamente.`

A confirmação no Supabase de homologação encontrou `1` evento `rate_limited` na última hora, nenhum registro para `qa.rate-limit.abuso.20260819@atleticafsa.test` em `member_interest_applications` e contador final `11` no bucket de teste. Assim, o bloqueio ocorreu antes da persistência do cadastro e deixou a telemetria esperada.

## Resultado — métricas administrativas e correção de regressão

Durante a consulta do histórico de sete dias com o contexto autenticado da Presidência, foi identificada uma incompatibilidade entre o retorno `timestamp with time zone` de `generate_series` e o contrato `date` da função `get_member_interest_abuse_daily_metrics`. A falha foi isolada antes da promoção, corrigida pela migração versionada `20260819211500_fix_member_interest_abuse_daily_metrics.sql` e aplicada somente em homologação.

Após a correção, a execução no mesmo contexto autenticado retornou o resumo de 24 horas com `2` eventos, sendo `1` de `rate_limited` e `1` de `validation_rejected`, além da linha diária de `2026-08-19` com os mesmos totais. O resultado confirma o contrato que o painel **SEGURANÇA DA LANDING** consome na rota administrativa da Presidência.

O acesso visual ao painel ficou pendente nesta sessão porque a credencial por senha disponível para o usuário administrador não foi aceita no Preview e o botão de Google OAuth não iniciou o redirecionamento. A página permanece protegida por `requirePresident()` e as duas RPCs foram confirmadas com o contexto autenticado de Presidência. Essa limitação de sessão será preservada como pendência de autenticação de homologação, sem alterar credenciais ou configurações de provedores durante esta validação.

## Resultado — honeypot

O contrato de bloqueio do honeypot foi executado na suíte automatizada específica, incluindo a verificação de que o ramo de honeypot ocorre antes da persistência de interesse. O cenário manual de navegador permanece não concluído porque o campo `Empresa` é corretamente não focalizável e visualmente oculto (`tabIndex=-1` e `aria-hidden=true`), e o navegador conectado não expôs uma forma segura de preenchê-lo sem modificar a aplicação. A promoção permanece condicionada à decisão sobre esta evidência automatizada ou à repetição manual por uma sessão que permita usar o console de desenvolvimento.
