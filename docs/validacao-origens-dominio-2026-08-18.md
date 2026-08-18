# Validação de origens, domínio e callbacks — 18 de agosto de 2026

## Escopo e proteção

Esta verificação é somente leitura e não altera o Supabase de Production, segredos, domínio, variáveis ou configurações de pagamento. Os valores de chaves e variáveis sensíveis não são registrados neste documento.

## Evidência inicial da Vercel

No projeto `atletica-fsa`, a lista de variáveis da Vercel confirmou a existência de `NEXT_PUBLIC_APP_URL` nos ambientes **Production e Preview**. A tela de listagem não exibe o valor, e a tentativa de abrir sua visualização não apresentou o conteúdo configurado nem realizou nenhuma alteração. Portanto, a confirmação do valor canônico e das origens permitidas permanece pendente de inspeção controlada.

| Controle | Estado observado | Próxima validação |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Presente em Production e Preview | Confirmar que o valor é `https://atleticafsa.site`. |
| `PAYMENTS_ENABLED` | Entradas separadas para Production e Preview | Confirmar somente o gate de Production como `false`, sem expor valores ou segredos. |
| Credenciais públicas Supabase | Entradas exclusivas de Preview visíveis na lista | Confirmar isolamento de Preview e redirecionamentos Auth. |
| Checkout Pro | A rota constrói `notification_url` e `back_urls` a partir de `NEXT_PUBLIC_APP_URL` | Verificar que a origem canônica resolve no deployment de Production. |

## Referência de implementação

A rota `POST /api/checkout` usa `env.appUrl` para criar a URL de notificação e os retornos de sucesso, pendência e falha do Checkout Pro. Assim, a correção da origem configurada é suficiente para manter esses quatro callbacks no mesmo domínio público, desde que a variável esteja correta no ambiente em execução.

A verificação local não dispõe de uma vinculação de projeto ou cliente da Vercel e, portanto, não pode ler valores remotos de variáveis por linha de comando. No painel, a variável `NEXT_PUBLIC_APP_URL` foi localizada para Production e Preview, mas o valor ficou deliberadamente oculto na interface. A validação deste valor deve ser concluída diretamente no painel de variáveis, sem expor o segredo nem alterar o escopo de ambiente.

## Verificação do Supabase de Production

O painel **Authentication → URL Configuration** do projeto de Production foi consultado em modo somente leitura. A configuração ainda utiliza a origem legada da Vercel, e não o domínio canônico:

| Campo | Valor observado | Situação esperada |
|---|---|---|
| Site URL | `https://atletica-fsa.vercel.app` | `https://atleticafsa.site` |
| Redirect URL 1 | `https://atletica-fsa.vercel.app/auth/callback` | Manter como contingência ou substituir conforme política de domínio. |
| Redirect URL 2 | `https://atletica-*-moises-faustino-rodrigues-s-projects.vercel.app/auth/callback` | Manter para Previews isolados. |
| Redirect URL ausente | `https://atleticafsa.site/auth/callback` | Deve ser incluída antes do próximo login no domínio próprio. |

Esse descompasso pode encaminhar callbacks e variáveis de e-mail para a origem legada. A alteração requer confirmação explícita, pois afeta o fluxo de autenticação de usuários reais em Production.

Após a confirmação do responsável, o campo **Site URL** foi preparado com `https://atleticafsa.site`. O valor ainda aguardava o salvamento no painel no momento deste registro; os redirecionamentos existentes permaneciam inalterados.

O salvamento foi concluído e a tela voltou ao estado sem alterações pendentes, mantendo `https://atleticafsa.site` no campo **Site URL**. As duas URLs de redirecionamento preexistentes foram preservadas e o próximo passo aprovado é adicionar o callback do domínio próprio.

O callback `https://atleticafsa.site/auth/callback` foi incluído e a lista passou a totalizar três URLs autorizadas. A configuração final preserva a compatibilidade com a origem legada da Vercel e com Previews, enquanto permite o fluxo de login e OAuth no domínio canônico.

## Verificação inicial do Resend

No workspace `fsa` do Resend, o domínio `atleticafsa.site` aparece como **Partially Failed**. Isso indica que a identidade remetente não deve ser considerada pronta para confirmações de Auth ou e-mails operacionais até a identificação e correção dos registros DNS pendentes. Nenhuma configuração de DNS ou envio foi alterado durante esta consulta.

Os detalhes do domínio esclarecem o diagnóstico: o registro DKIM (`resend._domainkey`) e os dois registros de envio (MX e SPF em `send`) estão **Verified**. A falha é o MX de `@` solicitado apenas na seção **Enable Receiving**, para recebimento de e-mails pelo Resend. Como a plataforma envia e-mails transacionais e não processa caixa de entrada, esse registro pendente não bloqueia, por si só, o envio via Resend ou SMTP; ele explica o estado visual parcial e só deve ser configurado se o recebimento no Resend passar a ser um requisito.

## Configuração SMTP do Supabase

A seção **Authentication → Emails** do Supabase de Production está acessível e expõe uma área própria de **SMTP Settings**. A inspeção da configuração de transporte ainda será feita em modo somente leitura; nenhum template ou evento de e-mail foi modificado.

A inspeção confirmou que o SMTP personalizado está habilitado e aponta para o Resend com `smtp.resend.com`, porta `465`, usuário `resend` e intervalo mínimo de 60 segundos. A senha permanece protegida, como esperado. O remetente, porém, ainda é `onboarding@resend.dev`; com os registros de envio de `atleticafsa.site` já verificados, o ajuste recomendado é usar `noreply@atleticafsa.site` como remetente. A mudança exige confirmação por afetar os e-mails de autenticação reais.

Com a confirmação recebida, o campo de remetente foi preparado com `noreply@atleticafsa.site`, sem tocar na senha, no host, na porta, no usuário ou no nome de exibição. O painel apresentava a alteração pendente de salvamento no momento deste registro.

A ação **Save changes** foi acionada no Supabase de Production. A interface entrou no estado de processamento e a confirmação definitiva será registrada após a recarga sem alterações pendentes.

Após a primeira tentativa, o valor continua visível como `noreply@atleticafsa.site`, mas a interface ainda mantém as ações **Cancel** e **Save changes**, sem uma notificação de sucesso observável. Portanto, a persistência não foi assumida; uma nova tentativa controlada e uma recarga serão usadas para confirmar o resultado.

Uma segunda ação de salvamento foi enviada. O botão entrou novamente em processamento, porém o painel não forneceu erro nem confirmação imediata. O remetente continua configurado visualmente no formulário, mas o resultado ainda depende de confirmação por recarga de página.

Após a recarga da página, o Supabase carregou `noreply@atleticafsa.site` como valor do remetente, sem alterações pendentes no formulário. Isso confirma a persistência da configuração SMTP de Production. Um teste de entrega real permanece separado desta evidência e deve usar uma caixa de e-mail externa com autorização explícita, sem criar dados de teste em Production.

## Validação técnica local

Em 18 de agosto de 2026, após as alterações de configuração externas, o repositório passou por `pnpm typecheck`, `pnpm test` e `pnpm build`. O typecheck e o build de produção concluíram com êxito. A suíte Vitest concluiu com **32 arquivos aprovados**, **1 arquivo ignorado**, **108 testes aprovados** e **3 testes ignorados**. O build emitiu apenas avisos existentes do Autoprefixer sobre `start`/`end` em regras de flexbox, sem impedir a compilação.
