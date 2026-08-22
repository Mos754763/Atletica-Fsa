# Ativação do Cloudflare Turnstile — produção

**Data:** 22 de agosto de 2026  
**Escopo:** fluxos por e-mail e senha do Supabase Auth da ATLETICA FSA.

## Configuração aprovada no Cloudflare

O widget foi preparado no painel Cloudflare com o nome operacional **ATLETICA FSA — Auth Production**. A modalidade selecionada é **Managed**, recomendada pelo provedor, para que o desafio seja proporcional ao risco. Os únicos hostnames autorizados são `atleticafsa.site` e `www.atleticafsa.site`.

O widget foi criado com sucesso no painel Cloudflare durante esta validação. As chaves foram entregues somente pela interface do provedor; seus valores não foram copiados para este repositório, documentação ou conversa.

Nenhuma Secret Key foi registrada neste repositório, em arquivos de ambiente, em logs ou nesta evidência. A Sitekey pública foi adicionada como `NEXT_PUBLIC_TURNSTILE_SITE_KEY` nos ambientes Preview e Production da Vercel. A Secret Key será registrada apenas em **Supabase → Authentication → Attack Protection → CAPTCHA**, usando o provedor Turnstile.

## Estado da configuração no Supabase

Em 22 de agosto de 2026, a configuração foi concluída em **Authentication → Attack Protection**: o controle `Enable Captcha protection` está habilitado, o provedor selecionado é `Turnstile by Cloudflare` e a Secret Key permanece mascarada no campo protegido. O usuário salvou a alteração diretamente no painel; uma nova leitura confirmou o estado persistido sem revelar a credencial.

## Ordem de ativação segura

1. Criar o widget com os dois hostnames acima e modo Managed.
2. Registrar a Sitekey pública na Vercel e implantar o commit que inclui `AuthCaptcha`.
3. Implantar o commit que inclui `AuthCaptcha`, para que a Sitekey cadastrada na Vercel seja incorporada ao bundle.
4. Confirmar visualmente o widget e os fluxos de login, cadastro e recuperação em Preview.
5. Repetir os testes de autenticação em produção com uma conta de QA, sem usar credenciais administrativas.
6. Se houver bloqueio inesperado, desabilitar temporariamente CAPTCHA no Supabase; a reversão primária é o toggle do provedor.

## Limites deliberados

O Google OAuth continua fora deste escopo porque a assinatura do método `signInWithOAuth` da versão instalada do SDK não aceita `captchaToken`. O mecanismo não substitui os limites de autenticação do Supabase, a política de mensagens genéricas nem os controles já implantados de sessão e enumeração.

## Referências

- [Supabase Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha)
- [Cloudflare Turnstile — widget management](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/)
- [Cloudflare Turnstile — server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
