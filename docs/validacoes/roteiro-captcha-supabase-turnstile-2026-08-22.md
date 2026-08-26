# Roteiro de ativação de CAPTCHA para Supabase Auth

**Data:** 22 de agosto de 2026  
**Autor:** Manus AI  
**Escopo:** login por e-mail e senha, cadastro e recuperação de senha da ATLETICA FSA. Não ativa pagamentos, não altera perfis, estoque ou preços.

## Decisão proposta

Recomenda-se **Cloudflare Turnstile** no modo **Managed**. O Supabase suporta oficialmente Turnstile e hCaptcha nos formulários de login, cadastro e recuperação de senha; a recomendação prioriza o fluxo gerenciado e a boa adaptação a uma aplicação web pública. [1]

> O CAPTCHA deve ser integrado e publicado **antes** de habilitar a exigência no Supabase. Quando a proteção é ativada no projeto, os fluxos de autenticação protegidos passam a exigir um `captchaToken`; inverter a ordem pode impedir login, cadastro e recuperação até a correção.

| Dado | Onde fica | Pode aparecer no navegador? |
| --- | --- | --- |
| Sitekey do Turnstile | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na Vercel | Sim. É a chave pública do widget. |
| Secret Key do Turnstile | Apenas em **Supabase → Authentication → Attack Protection** | **Não.** Não criar variável Vercel, não enviar em chat e não versionar. |
| Token de desafio | Estado efêmero do formulário | Somente durante a submissão; não registrar em logs. |

## Passos exatos

### 1. Criar o widget Turnstile

1. Acesse o [painel Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) e selecione **Add widget**.
2. Use o nome `ATLETICA FSA — Supabase Auth Production`.
3. Em **Hostname management**, registre `atleticafsa.site`. Adicione `www.atleticafsa.site` apenas se esse host também redirecionar ou servir autenticação. Para Preview, crie um segundo widget, por exemplo `ATLETICA FSA — Preview`, com o hostname real de Preview aprovado; não reutilize a Secret Key de produção no ambiente de teste.
4. Escolha o modo **Managed** e conclua em **Create**.
5. Copie a **Sitekey** e a **Secret Key**. A Cloudflare instrui criar o widget, definir os hostnames e guardar a Secret Key com segurança. [2]

### 2. Preparar a aplicação antes de ativar a proteção

1. Em Vercel → **Settings → Environment Variables**, crie `NEXT_PUBLIC_TURNSTILE_SITE_KEY` com a **Sitekey** do widget correspondente. Aplique a chave de Preview apenas em Preview e a de Production apenas em Production.
2. Não crie uma variável para a **Secret Key**. Ela será guardada pelo Supabase no passo 4.
3. No repositório, instale `@marsidev/react-turnstile` e incorpore o widget em `src/components/auth/LoginForm.tsx` com os callbacks `onSuccess`, `onExpire` e `onError`.
4. Armazene somente o token no estado temporário do componente. Desabilite o envio por e-mail/senha enquanto o token não existir; em expiração, erro ou retorno de uma requisição, limpe o token e reinicialize o widget. O tratamento explícito de erro, expiração e retentativa evita estados de desafio inválido em redes instáveis. [3]
5. Passe o token às três chamadas atuais da aplicação, sem alterar mensagens genéricas de falha:

```ts
await supabase.auth.signInWithPassword({
  email,
  password,
  options: { captchaToken },
});

await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback?next=/conta`,
    captchaToken,
  },
});

await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: buildPasswordRecoveryRedirect(window.location.origin),
  captchaToken,
});
```

O SDK instalado aceita `captchaToken` nas três assinaturas acima. O método `signInWithOAuth` usado pelo Google não expõe esse parâmetro na versão atual do SDK; portanto, ele deve continuar protegido pelos limites do Supabase, pelo provedor Google e pelas regras de callback existentes, sem adicionar uma propriedade não suportada.

### 3. Testar em Preview antes da exigência no Supabase

1. Faça deploy de Preview com o widget renderizado, ainda com a chave **Enable CAPTCHA protection** desligada no Supabase.
2. Em janela anônima, teste cadastro, login com senha e recuperação usando contas de QA. Confirme que o widget gera token, que o botão fica indisponível sem token e que erro/expiração permitem novo desafio.
3. Verifique que login inválido e recuperação de e-mail inexistente continuam exibindo apenas a mensagem genérica já implementada, sem indicar se uma conta existe.
4. Verifique o redirecionamento pós-login, callback de recuperação e Google OAuth. CAPTCHA não deve alterar URLs de retorno, RBAC, MFA, pedidos ou pagamentos.
5. Execute `pnpm test`, `pnpm typecheck` e `pnpm build` após a integração, incluindo um teste de componente que confirme a ausência de submissão sem token e o reset do token após resposta.

### 4. Habilitar no Supabase após o Preview verde

1. Em **Supabase → Authentication → Attack Protection**, ative **Enable Captcha protection**.
2. Selecione **Cloudflare Turnstile** como provedor.
3. Cole a **Secret Key** do widget do ambiente correspondente no campo do Supabase e selecione **Save changes**. O Supabase orienta exatamente essa seleção de provedor, inclusão da chave secreta e salvamento no painel de proteção. [1]
4. Faça imediatamente os três testes de autenticação em janela anônima. Em caso de bloqueio, desligue a chave de CAPTCHA no Supabase para restaurar o fluxo; não exponha a Secret Key nem tente contornar a verificação por código.

### 5. Ativar em Production de forma reversível

1. Confirme que o widget de Production contém `atleticafsa.site` e que `NEXT_PUBLIC_TURNSTILE_SITE_KEY` de Production é a Sitekey correta.
2. Publique o código primeiro e valide que o widget aparece no login em `https://atleticafsa.site/login`.
3. Habilite a proteção no **projeto Supabase Production** usando a Secret Key do widget de Production.
4. Execute uma bateria curta em janela anônima: login de QA válido, credencial inválida, recuperação com e-mail de QA e recuperação com e-mail inexistente. Não use dados de membros reais nem modifique estoque ou pedidos.
5. Registre a evidência sem tokens, sem endereços de e-mail e sem a Secret Key. Mantenha os limites atuais do Supabase: **30** cadastros/logins por IP a cada cinco minutos, **30** verificações de token/OTP por IP a cada cinco minutos e **150** refreshes por IP a cada cinco minutos.

## Critério de aceite

| Área | Resultado esperado |
| --- | --- |
| Login, cadastro e recuperação | Requerem token válido após ativação, mas preservam feedback genérico e acessível. |
| Google OAuth | Continua iniciando e retornando pelo callback autorizado, sem parâmetro de CAPTCHA não suportado. |
| CORS e tokens | Não há CORS wildcard; bearer continua validado por `supabase.auth.getUser`, sem token em URL ou resposta. |
| Reversão | Desativar temporariamente o toggle no Supabase restaura os fluxos enquanto a causa é investigada. |
| Segurança de chaves | Secret Key nunca entra no código, Git, Vercel, logs, chat ou capturas. |

## Referências

[1]: https://supabase.com/docs/guides/auth/auth-captcha "Supabase — Enable CAPTCHA Protection"
[2]: https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/ "Cloudflare — Create and manage widgets using the dashboard"
[3]: https://developers.cloudflare.com/turnstile/troubleshooting/client-side-errors/ "Cloudflare — Client-side errors"
