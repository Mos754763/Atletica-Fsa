# Recuperação de configuração Supabase em Production — 18 de agosto de 2026

## Diagnóstico

Ao abrir `https://atleticafsa.site/admin/integracoes/sympla`, a Vercel registrou `GET 500` com a mensagem `Configuração pública do Supabase ausente.`. A falha ocorria antes de qualquer chamada à API da Sympla; portanto, não era evidência suficiente para atribuir o problema à credencial `SYMPLA_API_TOKEN`.

Na página de variáveis de ambiente da Vercel, verificou-se que `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` estavam presentes apenas em **Preview**, sem escopo de **Production**.

## Correção aprovada e aplicada

Com confirmação expressa do responsável, foram adicionadas três variáveis exclusivas de **Production**, todas apontando ao projeto Supabase de produção `tbxihkzuyzszrfxqmleq`:

| Variável | Escopo | Finalidade |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Production | URL pública consumida pelo cliente Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production | Chave pública do cliente Supabase |
| `SUPABASE_SECRET_KEY` | Production | Credencial server-side para rotas administrativas |

Os valores não são reproduzidos neste documento. As variáveis de Preview, incluindo as exclusivas da homologação, não foram editadas.

## Próximo passo obrigatório

A Vercel confirmou o cadastro e indicou que um **novo deploy de Production** é necessário para que as variáveis tenham efeito. Somente depois desse deploy a rota `/admin/integracoes/sympla` deverá ser reaberta e a sincronização manual de catálogo poderá ser executada uma única vez para isolar o eventual HTTP 403 da Sympla.

## Redeploy

Com aprovação do responsável, foi iniciado o redeploy de Production `FTd8hjWuaJ3H9uzj2p7fP6R78ZsM`, a partir do commit `3368b72` em `main`. O deployment preserva o código atual e aplica apenas as configurações de ambiente recém-cadastradas. O estado observado durante o registro era `Building`; a disponibilidade da rota administrativa só será validada após a conclusão com sucesso.

## Validação concluída

O redeploy terminou com estado **Ready** em 1 minuto e 12 segundos, mantendo `atleticafsa.site` como domínio atribuído. Após login administrativo, a rota `/admin/integracoes/sympla` voltou a carregar normalmente, sem o erro de configuração pública ausente. Uma única execução controlada de **Sincronizar catálogo**, em modo somente leitura, foi registrada como `SUCCEEDED` às 15:55 de 18/08/2026, com zero eventos retornados e sem alteração no fluxo interno. Isso confirma que a recuperação das variáveis de Production removeu o bloqueio que impedia a validação da integração externa.
