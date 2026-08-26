# Revalidação de tentativas, CORS e tokens — 22 de agosto de 2026

## Evidência do painel Supabase Production

| Controle | Valor observado | Escopo |
| --- | --- | --- |
| Envio de e-mails de autenticação | 30 por hora | Projeto Supabase Production |
| Refresh de token | 150 por IP a cada 5 minutos | Projeto Supabase Production |
| Verificação de token/OTP | 30 por IP a cada 5 minutos | Projeto Supabase Production |
| Cadastro e login | 30 por IP a cada 5 minutos | Projeto Supabase Production |
| CAPTCHA | Desativado | Authentication → Attack Protection |

O painel foi consultado em modo somente leitura. Nenhum limite, segredo, provedor ou política foi alterado durante esta revalidação.

## Evidência HTTP de Production

Uma consulta não autenticada à raiz pública e à rota protegida `POST /api/checkout/resume`, além de um preflight `OPTIONS` com origem não confiável, confirmou que não há `Access-Control-Allow-Origin` nem outro cabeçalho `Access-Control-*` que abra a API ao navegador de terceiros. O preflight respondeu somente com `Allow: OPTIONS, POST`.

As duas respostas também apresentaram `Content-Security-Policy` com `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, HSTS e `Referrer-Policy: strict-origin-when-cross-origin`. A resposta da rota protegida sem o método esperado retornou `405`, sem dados ou token.

## Evidência de token

As APIs extraem apenas o bearer do cabeçalho `Authorization`, validam-no remotamente com `supabase.auth.getUser(token)` antes de consultar o perfil e não decodificam JWT localmente. Tokens não são aceitos por URL nem retornados nas respostas.

## Próxima ação externa

Para ativar CAPTCHA sem interromper autenticação, deve-se primeiro criar o site no provedor escolhido, configurar a chave secreta no Supabase e integrar o token de desafio no cliente antes de habilitar a chave de proteção no painel. O roteiro completo será validado contra a documentação oficial e entregue junto aos resultados dos testes.
