# Diagnóstico de autenticação Sympla — HTTP 403

**Data:** 18 de agosto de 2026  
**Escopo:** Investigação controlada da sincronização somente leitura de eventos da Sympla.  
**Segurança:** Nenhum token, valor de cabeçalho ou resposta que possa conter segredo é registrado neste documento.

## Base oficial consultada

A documentação atual da Sympla informa que operações privadas usam o cabeçalho HTTP `s_token`, que a API de produção é servida em `https://api.sympla.com.br/public` e que a listagem de eventos está disponível em `GET /v1.6.0/events`. A mesma documentação orienta gerar a chave de acesso associada ao usuário em **Minha Conta > Integrações**.

| Referência | Informação confirmada |
|---|---|
| [Portal de desenvolvedores da Sympla](https://developers.sympla.com.br/api-doc/) | Header `s_token`; servidor de produção; rota de listagem de eventos em `v1.6.0`. |
| [Ajuda ao produtor — configurar API pública](https://ajuda.produtor.sympla.com.br/hc/pt-br/articles/15422073696653-Como-configurar-API-p%C3%BAblica) | Tokens são criados em **Minha Conta > Integrações** e ficam associados ao usuário produtor. |

## Implementação atual

O cliente server-side em `src/lib/integrations/sympla.ts` usa `GET https://api.sympla.com.br/public/v1.6.0/events?page_size=10`, envia `s_token` somente no cabeçalho e não faz retentativas para respostas definitivas, incluindo `403`. Portanto, o endpoint e o mecanismo de autenticação do código estão aderentes à documentação atual.

O teste ao vivo permanece opt-in: ele só executa com `RUN_LIVE_SYMPLA_CONNECTION_TEST=true` e `SYMPLA_API_TOKEN` configurados. A evidência histórica disponível informa que esse teste retorna HTTP 403; assim, a hipótese prioritária é **token revogado, copiado incompletamente, criado por usuário sem acesso à conta produtora correta ou sem permissão para os eventos consultados**, e não falha de retry ou de rota.

## Próxima verificação controlada

1. Verificar no painel da Sympla se a chave ativa pertence ao usuário produtor que controla os eventos da ATLETICA FSA.
2. Se houver dúvida, criar uma nova chave de acesso identificada como integração ATLETICA FSA — Production e substituir o valor de `SYMPLA_API_TOKEN` somente por canal secreto.
3. Executar a verificação leve de `GET /v1.6.0/events?page_size=10`; registrar apenas o status HTTP e a contagem de eventos.
4. Manter a sincronização em modo `read_only` e confirmar que uma resposta 200 apenas espelha metadados de eventos, sem criar vendas ou alterar inscrições.

## Resultado da validação

O diagnóstico foi concluído após identificar e corrigir uma configuração anterior na Vercel: as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` estavam limitadas a Preview, fazendo a rota administrativa de Production falhar antes da chamada à Sympla. As três variáveis foram cadastradas para Production, o deploy `FTd8hjWuaJ3H9uzj2p7fP6R78ZsM` foi concluído com sucesso e uma consulta de catálogo em modo somente leitura retornou `SUCCEEDED` às 15:55 de 18/08/2026, com zero eventos e sem escrita financeira ou alteração na Sympla.

Portanto, o HTTP 403 histórico não exigiu mudança de endpoint nem alteração do header `s_token`: a implementação existente já estava aderente à documentação. A chamada atual foi autorizada, o que demonstra que a credencial disponível está válida para a conta consultada. Os dead letters antigos foram preservados como trilha de auditoria e não devem ser reprocessados apenas para apagar o histórico.
