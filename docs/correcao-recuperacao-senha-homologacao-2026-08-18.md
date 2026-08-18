# Correção do fluxo de recuperação de senha — homologação

## Sintoma

No Preview de homologação, o usuário conseguia solicitar a recuperação de acesso no Supabase, mas o retorno do e-mail não oferecia uma tela para definir uma nova senha. O callback apenas trocava o código por sessão e redirecionava a rota indicada; como não existia uma página de redefinição nem uma chamada a `auth.updateUser`, o fluxo terminava na tela de login sem atualizar a credencial.

## Correção aplicada no código

Foi incluído o modo **Esqueci minha senha** no formulário de login. Ele chama `resetPasswordForEmail` com retorno para `/auth/callback?next=/redefinir-senha`. A página nova `/redefinir-senha` exige a confirmação da senha e chama `supabase.auth.updateUser({ password })` apenas após o callback trocar o código por uma sessão de recuperação.

O redirecionamento é construído pelo helper `buildPasswordRecoveryRedirect`, coberto por teste unitário. A validação local de 18/08/2026 aprovou esse teste e o `pnpm typecheck`.

## Limite de ambiente

A correção será publicada inicialmente apenas no Preview da homologação. A validação de ponta a ponta requer pedir um novo e-mail de recuperação, abrir o link uma única vez e definir uma senha nova. O link anterior não deve ser reutilizado, pois links de recuperação são de uso único.

## Diagnóstico complementar — 18/08/2026

O comportamento observado no navegador foi confirmado no painel do projeto Supabase de homologação: a **Site URL** estava configurada como `http://localhost:3000` e a lista de **Redirect URLs** estava vazia. Por isso, o Supabase descartava o `redirectTo` enviado pelo Preview e aplicava o fallback local, gerando links que falham fora de uma máquina com servidor local ativo.

A correção exige configurar uma URL estável de homologação como Site URL e autorizar explicitamente os callbacks do Preview, incluindo `/auth/callback`. Após salvar essa configuração, deve-se solicitar um e-mail novo e utilizar apenas esse novo link para validar a tela `/redefinir-senha`.

Em 18/08/2026, foi autorizada e salva a URL de callback `https://atletica-fsa-git-si-19f3f2-moises-faustino-rodrigues-s-projects.vercel.app/auth/callback` no projeto de homologação. A troca da Site URL ainda deve ser gravada antes do novo disparo do e-mail.

Na sequência, a Site URL de homologação foi alterada e salva como `https://atletica-fsa-git-si-19f3f2-moises-faustino-rodrigues-s-projects.vercel.app`. O projeto agora não possui fallback para `localhost`; o próximo passo é emitir uma recuperação nova e validar o callback com o token de uso único recém-criado.

Um novo pedido de recuperação foi emitido pelo Preview na mesma origem autorizada. A interface retornou a confirmação neutra esperada: "Se o e-mail estiver cadastrado, você receberá um link seguro para definir uma nova senha." O token anterior que apontava para `localhost` não deve ser reutilizado.

**Evidência de entrega:** a caixa postal do administrador recebeu uma nova mensagem de `Supabase Auth` às 15:26, depois de a configuração de URLs ter sido salva. A mensagem anterior, de 13:28, permanece distinta e é a que levou ao destino `localhost`.

## Validação do callback e estado de provedores — 15:33

Foi inspecionado o destino dos links sem expor os respectivos códigos de uso único. O e-mail anterior ainda contém o fallback legado `http://localhost:3000`, enquanto o e-mail emitido após a correção aponta para `https://atletica-fsa-git-si-19f3f2-moises-faustino-rodrigues-s-projects.vercel.app/auth/callback?next=/redefinir-senha`. Logo, a emissão atual usa o callback correto do Preview e alcança a rota que troca o código de recuperação por sessão antes de exibir o formulário.

O erro reportado em Google OAuth é independente da senha: o Supabase de homologação respondeu `provider is not enabled` para `provider=google`. O provedor Google não está habilitado nesse projeto de teste; sua ativação requer a configuração de um cliente OAuth de Google separado, com credenciais e redirect URI de homologação. Essa indisponibilidade não impede o reset por e-mail/senha.

O navegador registrou uma tentativa com token já invalidado ou expirado (`otp_expired`). Como links de recuperação são de uso único, a validação final deve usar um link novo, emitido após este registro, uma única vez e imediatamente seguido da definição de senha.

O painel Authentication → Sign In / Providers da homologação confirma: **Email está Enabled** e **Google está Disabled**. Portanto, o único caminho de autenticação aplicável a esse ambiente até uma configuração OAuth própria é e-mail/senha com recuperação por link.

Após a tentativa que resultou em `otp_expired`, foi aberto o fluxo de recuperação no Preview correto e preenchido o e-mail administrativo para emissão de um novo token. Esse token deve substituir todos os links anteriores e ser usado imediatamente uma única vez.

Na tentativa de emitir outro e-mail em sequência, o Supabase respondeu `email rate limit exceeded`. Não houve alteração de senha nem alteração de dados: trata-se do limite de proteção da entrega de e-mails. A mensagem de 15:26, emitida já com callback correto, deve ser utilizada caso ainda não tenha sido acionada; novos pedidos devem aguardar o período de limitação definido pelo Supabase.
