# Correção do fluxo de recuperação de senha — homologação

## Sintoma

No Preview de homologação, o usuário conseguia solicitar a recuperação de acesso no Supabase, mas o retorno do e-mail não oferecia uma tela para definir uma nova senha. O callback apenas trocava o código por sessão e redirecionava a rota indicada; como não existia uma página de redefinição nem uma chamada a `auth.updateUser`, o fluxo terminava na tela de login sem atualizar a credencial.

## Correção aplicada no código

Foi incluído o modo **Esqueci minha senha** no formulário de login. Ele chama `resetPasswordForEmail` com retorno para `/auth/callback?next=/redefinir-senha`. A página nova `/redefinir-senha` exige a confirmação da senha e chama `supabase.auth.updateUser({ password })` apenas após o callback trocar o código por uma sessão de recuperação.

O redirecionamento é construído pelo helper `buildPasswordRecoveryRedirect`, coberto por teste unitário. A validação local de 18/08/2026 aprovou esse teste e o `pnpm typecheck`.

## Limite de ambiente

A correção será publicada inicialmente apenas no Preview da homologação. A validação de ponta a ponta requer pedir um novo e-mail de recuperação, abrir o link uma única vez e definir uma senha nova. O link anterior não deve ser reutilizado, pois links de recuperação são de uso único.
