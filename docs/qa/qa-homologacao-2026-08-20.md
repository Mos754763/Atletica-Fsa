# QA automatizado em homologação — evidências

**Data:** 2026-08-20  
**Alvo candidato:** preview da branch `test/homologation-qa-runbook`  
**Modo:** somente leitura; sem pagamentos, escrita, e-mails, cron autorizado ou dados pessoais.

## Evidências iniciais

| Caso | Método | Resultado |
|---|---|---|
| Landing pública | Navegador autenticado na Vercel | A página carregou e apresentou a navegação pública, loja, eventos, login e formulário de interesse. |
| Configuração pública | Navegador autenticado na Vercel | `configured=true`; a URL retornada pertence ao projeto Supabase de homologação `gfnbdjdqumewspvfxicl`. |
| Smoke externo por CLI | Script `qa-homologation.mjs` | Bloqueado por HTTP 302 da proteção de Preview da Vercel antes de alcançar o aplicativo. Não representa falha de rota nem de configuração do Supabase. |
| Catálogo e carrinho | Navegador autenticado na Vercel | A loja exibiu categorias, detalhes de produto, preços em reais, ação de carrinho e produto sandbox; não foi criada nenhuma compra. |
| Eventos públicos | Navegador autenticado na Vercel | A agenda exibiu o evento gratuito temporário de homologação e a ação de inscrição; a inscrição não foi iniciada. |
| Proteção administrativa | Navegador autenticado na Vercel | `/admin` redirecionou para `/login` sem expor conteúdo interno. |
| Recuperação de senha | Navegador autenticado na Vercel | A rota exibiu o formulário de nova senha, confirmação e ação de atualização; nenhuma senha foi inserida nem e-mail disparado. |

O roteiro recusa explicitamente Production e exige `QA_ENVIRONMENT=homologation`. A execução externa não deve contornar, reduzir ou desabilitar a proteção de Preview. Para automação HTTP sem sessão de navegador, será necessário um mecanismo de bypass temporário e rotacionável autorizado pela Vercel, ou uma execução autenticada no pipeline de Preview.

O script aceita o segredo oficial `VERCEL_AUTOMATION_BYPASS_SECRET` em ambiente de execução (ou o nome legado `QA_VERCEL_PROTECTION_BYPASS_SECRET`) e o envia somente nos cabeçalhos `x-vercel-protection-bypass` e `x-vercel-set-bypass-cookie`; ele não grava nem imprime o valor. Essa variável deve existir apenas no executor seguro de QA/CI e não deve ser versionada, copiada para Production ou reutilizada como segredo de cron.

Como alternativa para uma execução manual e temporária, o roteiro também aceita `QA_VERCEL_SHARE_URL`. Esse valor deve conter uma URL de compartilhamento temporária emitida pela Vercel para o **mesmo Preview** de `QA_BASE_URL`. Antes das sondagens, o roteiro troca a URL por um cookie efêmero em memória; não imprime, persiste, inclui no relatório nem envia a URL às rotas do aplicativo. O valor deve ser fornecido somente no processo atual e descartado imediatamente após a execução. O comando reproduzível é `pnpm qa:homologation`, com `QA_ENVIRONMENT=homologation`, `QA_BASE_URL` e **um** dos dois mecanismos de acesso temporário configurados no ambiente do processo.

Em 20/08/2026, o acesso temporário de compartilhamento e o fetch autenticado da Vercel ainda retornaram redirecionamento SSO para requisições HTTP sem uma sessão de automação. Assim, os smoke tests remotos diretos permanecem corretamente classificados como **não executados por bloqueio de proteção**, não como aprovação nem falha de aplicação. O próximo pré-requisito é gerar o *Protection Bypass for Automation* no painel da Vercel e disponibilizá-lo exclusivamente ao executor de QA como `VERCEL_AUTOMATION_BYPASS_SECRET`.[1]

### Execução aprovada com acesso temporário

Em 20/08/2026, o novo modo temporário foi executado contra o Preview isolado `atletica-ler3q83aj-moises-faustino-rodrigues-s-projects.vercel.app`. A URL temporária emitida pela Vercel foi usada exclusivamente em memória para obter o cookie da sessão de Preview e foi descartada ao encerrar o processo. O relatório do roteiro foi aprovado integralmente em modo somente leitura: landing, loja, eventos, login, redefinição de senha e configuração pública retornaram HTTP 200; `/admin` retornou HTTP 307 para `/login`; e `/api/cron/integration-health` retornou HTTP 401 sem acionar o cron.

Na mesma revisão, a validação completa local aprovou **57 arquivos de teste** com **193 testes aprovados** e **3 ignorados intencionalmente**, além de `pnpm typecheck` e `pnpm build`. Essa suíte cobre os contratos de catálogo, eventos, ODS, pedidos, Mercado Pago, Sympla, Slack, cron, permissões e demais integrações sem realizar pagamentos, escrita remota, envios de e-mail ou alterações em dados produtivos.

### Reconfirmação segura de ambiente

Em 20/08/2026, uma leitura autenticada pelo controle de acesso da Vercel à rota `/api/public-config` do Preview da revisão de QA retornou HTTP 200 e `configured=true`. A URL pública retornada aponta para `gfnbdjdqumewspvfxicl`, o projeto Supabase de homologação. A verificação não imprimiu, alterou ou transportou chaves privadas; logo, confirma o isolamento da configuração exposta ao navegador sem substituir os smoke tests de fluxo autenticado.

Na mesma rodada, a tentativa de leitura de `/admin` nesse Preview recebeu HTTP 302 para o SSO da Vercel antes de alcançar a autenticação da aplicação. Portanto, esse método confirma que a proteção de deployment continua ativa, mas não pode ser usado como evidência do redirecionamento interno de RBAC. A prova desse boundary permanece coberta pelo teste local e deve ser repetida em Preview somente com o bypass temporário de automação autorizado.

## Validações automatizadas locais

Em 20/08/2026, na mesma revisão candidata de homologação, a suíte completa aprovou **53 arquivos de teste**, com **181 testes aprovados** e **3 ignorados intencionalmente**; a auditoria de dependências produtivas não encontrou vulnerabilidades conhecidas e o build Next.js 16.3.1 concluiu com êxito. A cobertura inclui contratos de autenticação, MFA, permissões, eventos e check-in, ODS, estoque e pedidos, Mercado Pago, Sympla, Slack, cron, LGPD, catálogo, exportação e configuração Supabase.

O endpoint de cron `/api/cron/integration-health` respondeu `{"error":"Não autorizado."}` quando chamado no navegador sem credencial, confirmando a rejeição do caso não autorizado sem acionar a rotina.

## Referência

[1]: https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation "Vercel — Protection Bypass for Automation"
