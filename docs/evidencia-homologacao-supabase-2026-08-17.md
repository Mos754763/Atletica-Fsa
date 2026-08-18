# Evidência de aplicação — Supabase de homologação

**Data:** 17 de agosto de 2026
**Projeto alvo:** `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`)
**Proteção aplicada:** nenhuma conexão, comando ou migration foi direcionada ao projeto de produção `tbxihkzuyzszrfxqmleq`.

## Resultado da aplicação

Foram aplicadas com sucesso todas as migrations estruturais do repositório, incluindo a base de catálogo, pedidos, estoque, Mercado Pago, retirada por QR, ingressos, CRM, Sympla, health checks e integrações. O banco possui **43 tabelas base** no esquema `public`.

A migration `20260814121000_bootstrap_president.sql` foi deliberadamente revertida e mantida pendente. Ela não cria esquema: apenas promove o perfil com o e-mail do presidente. Como a homologação estava sem usuários e deve permanecer sem cópia de dados de produção, a própria migration abortou com a pré-condição esperada. Ela deve ser executada somente depois de criar um usuário proprietário exclusivo na homologação.

| Verificação | Resultado |
|---|---:|
| Conexão TLS ao pooler de homologação | Confirmada |
| Banco conectado | `postgres` no projeto `gfnbdjdqumewspvfxicl` |
| Tabelas base em `public` | 43 |
| `public.profiles` | 0 registros |
| `public.orders` | 0 registros |
| `public.payment_webhook_events` | 0 registros |
| Dados de produção copiados | Não |

## Próximos pré-requisitos

1. Obter as chaves publishable e secret do projeto `gfnbdjdqumewspvfxicl`.
2. Configurar exclusivamente o ambiente **Preview** da Vercel para apontar para a homologação.
3. Fornecer credenciais **sandbox** do Mercado Pago para Preview, sem alterar Production.
4. Configurar `PAYMENTS_ENABLED=true` apenas em Preview e manter `PAYMENTS_ENABLED=false` explicitamente em Production.
5. Executar o teste de webhook duplicado e validar uma única liquidação, uma única baixa de estoque e um único registro em `payment_webhook_events`.

## Auditoria inicial da Vercel

Na verificação de 17 de agosto de 2026, as variáveis de Supabase, Mercado Pago, Slack, Resend, Sympla, URL pública e segredo de cron estavam configuradas conjuntamente para **Production e Preview**. Dessa forma, o Preview ainda não está isolado e não é seguro habilitar pagamentos nele até separar os valores do Supabase e substituir as credenciais de Mercado Pago por credenciais sandbox exclusivas.

As chaves publishable e secret do projeto `gfnbdjdqumewspvfxicl` foram verificadas no painel restrito de API e ficam disponíveis exclusivamente para a configuração autorizada do ambiente Preview. Seus valores não são registrados neste repositório ou neste documento.

Após autorização do responsável, `NEXT_PUBLIC_SUPABASE_URL` foi atualizada com sucesso para `https://gfnbdjdqumewspvfxicl.supabase.co` com escopo **somente Preview**. A Vercel informou que será necessário um novo deployment para que a alteração entre em vigor. Production não foi modificada por essa alteração.

As chaves publishable e secret do projeto de homologação foram recuperadas pelo painel autenticado após autorização explícita. Os valores não são reproduzidos nesta evidência, em comandos persistentes ou no controle de versão; eles serão usados apenas nos campos protegidos da Vercel que têm escopo Preview.

A edição de `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` está preparada com a chave pública de homologação e escopo **Preview**. O salvamento é a próxima operação; Production segue fora do escopo selecionado.

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` foi salva com sucesso e escopo **Preview**. A Vercel confirmou que um novo deployment será necessário para efetivar a variável. A chave de Production não foi alterada.

`SUPABASE_SECRET_KEY` foi salva com sucesso usando a chave do projeto `gfnbdjdqumewspvfxicl` e escopo **Preview**. A Vercel confirmou novamente que será necessário um novo deployment. O valor de Production não foi alterado.

`PAYMENTS_ENABLED=false` foi adicionado com escopo exclusivamente de **Production**. Esse gate passa a ser explícito e impede a ativação acidental de pagamentos reais enquanto a homologação não estiver concluída.

As variáveis `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` ainda possuem escopo de Production e Preview, mas serão removidas de Preview antes do próximo deployment. Em seguida, Preview permanecerá com pagamentos desativados até receber credenciais sandbox independentes.

A edição de `MERCADO_PAGO_WEBHOOK_SECRET` foi preparada para o escopo **Production** exclusivamente. Falta somente confirmar o salvamento no painel para que o token real deixe de existir em Preview. A alteração equivalente de `MERCADO_PAGO_ACCESS_TOKEN` será feita em seguida.

`MERCADO_PAGO_WEBHOOK_SECRET` foi salvo com sucesso em escopo **Production** exclusivamente. A edição de `MERCADO_PAGO_ACCESS_TOKEN` foi aberta e será tratada com a mesma segregação antes da criação de um deployment de Preview.

## Ajuste de credenciais Mercado Pago

O responsável confirmou em 17 de agosto de 2026 que as credenciais atualmente cadastradas do Mercado Pago são exclusivamente de **sandbox/teste**. Portanto, `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` podem estar disponíveis no ambiente **Preview** para o ensaio de idempotência. O controle de segurança obrigatório é o gate `PAYMENTS_ENABLED=false` no ambiente **Production**, que foi salvo explicitamente.

O segredo de webhook está sendo reconfigurado para voltar a incluir Preview, preservando o mesmo valor sandbox já existente e sem registrar o valor neste repositório.

### Verificação no painel Vercel

Em `https://vercel.com/moises-faustino-rodrigues-s-projects/atletica-fsa/settings/environment-variables`, a lista atual confirmou o seguinte:

| Variável | Escopo exibido | Situação |
|---|---|---|
| `MERCADO_PAGO_ACCESS_TOKEN` | Production e Preview | Credencial sandbox disponível no Preview |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Production | Ainda precisa de entrada separada para Preview com o segredo sandbox |
| `PAYMENTS_ENABLED` | Production | Valor explícito `false` preservado |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | Aponta para a homologação |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preview | Chave da homologação |
| `SUPABASE_SECRET_KEY` | Preview | Segredo da homologação |

O gate de Preview deverá ser criado como uma entrada separada de `PAYMENTS_ENABLED=true` apenas depois que o segredo de webhook sandbox aparecer efetivamente com escopo Preview. Isso evita criar um deployment que aceite checkout, mas não consiga validar notificações de pagamento.

Na revisão visual subsequente do painel, a linha `MERCADO_PAGO_WEBHOOK_SECRET` ainda figurava como **Production**. A solicitação de criação da entrada de Preview foi encaminhada ao responsável, mas a interface não exibiu uma segunda linha com esse mesmo nome. Por isso, ela ainda não é considerada evidência de configuração concluída.

Ao tentar criar explicitamente a entrada Preview com o segredo sandbox fornecido, a Vercel recusou a operação informando que já existia uma variável com o mesmo nome para o alvo Preview. Porém, a edição da entrada visível continuou apresentando apenas **Production**. A divergência é tratada como inconsistência do painel até ser confirmada por um deployment de Preview; nenhuma alteração foi aplicada à entrada de Production nessa tentativa.

## Isolamento do Preview na Vercel

O painel foi atualizado e confirmado visualmente com as entradas abaixo. A lista expõe registros separados por ambiente, por isso nomes repetidos são esperados e necessários para preservar valores distintos.

| Variável | Escopo confirmado | Situação |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Preview | Aponta para `gfnbdjdqumewspvfxicl` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preview | Chave publishable da homologação |
| `SUPABASE_SECRET_KEY` | Preview | Chave secret da homologação |
| `MERCADO_PAGO_ACCESS_TOKEN` | Production e Preview | Credencial sandbox confirmada pelo responsável |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Preview | Segredo sandbox criado separadamente |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Production | Entrada anterior preservada, sem alteração nesta etapa |
| `PAYMENTS_ENABLED` | Preview | `true`, exclusivamente para a homologação |
| `PAYMENTS_ENABLED` | Production | `false`, bloqueio explícito preservado |

O painel solicitou uma nova implantação para que as variáveis de Preview passem a vigorar. A próxima etapa é gerar uma implantação de Preview a partir de uma branch de homologação e validar que ela recebe esse conjunto de variáveis.

## Deployment de Preview

Foi criado um redeploy explicitamente no ambiente **Preview**, cujo build concluiu com o estado **Ready** em 1 minuto e 7 segundos. A instância de homologação está disponível em `https://atletica-g9ueq84fp-moises-faustino-rodrigues-s-projects.vercel.app/` e é a única URL que será utilizada nos testes de Mercado Pago. A produção permanece em `https://atletica-fsa.vercel.app` e não receberá chamadas de teste.

## Proteção de deployment durante o teste

O primeiro webhook de teste foi bloqueado pela camada de autenticação da Vercel com `401 Protected deployment`, antes de alcançar a aplicação. Em vez de expor a URL de Preview ou reduzir a proteção global, foi autorizada a criação de um segredo de **Protection Bypass for Automation** temporário. O segredo será enviado apenas no cabeçalho da chamada de teste, não será salvo no repositório e será removido ao final da validação.

O painel da Vercel exige que um bypass informado manualmente tenha exatamente **32 caracteres**. A tentativa com um valor hexadecimal de 64 caracteres foi rejeitada pelo próprio formulário e não criou nenhum bypass; será substituída por um valor temporário compatível.

## Resultado do replay de webhook no Preview

Foi enviado ao Preview o mesmo webhook sandbox com assinatura HMAC SHA-256 válida duas vezes, usando um tópico `merchant_order` deliberadamente não liquidável. A primeira chamada foi registrada e classificada como ignorada; a segunda foi reconhecida como duplicada. Em seguida, o bypass de proteção temporário foi removido e a página da Vercel voltou a exibir apenas a opção de criar um novo segredo, confirmando que não existe bypass ativo.

| Evidência | Resultado |
|---|---:|
| URL testada | Deployment Preview isolado |
| Primeira chamada | HTTP 200; `merchant_order_not_enabled` |
| Segunda chamada idêntica | HTTP 200; `duplicate: true` |
| Linhas correspondentes em `payment_webhook_events` | 1 |
| Linhas correspondentes com status `ignored` | 1 |
| Pagamentos criados pelo evento ignorado | 0 |
| Movimentos de estoque na homologação vazia | 0 |
| Bypass de automação após o teste | Revogado |

Esse ensaio confirma a proteção contra replay e a deduplicação persistente do webhook em Preview. Ele não substitui a validação end-to-end da liquidação de pedido aprovado: esse fluxo exige produto, pedido e pagador sandbox próprios da homologação, que ainda não foram criados.

## Auditoria de CI/CD

O repositório `Mos754763/Atletica-Fsa` está conectado à Vercel e o painel confirma que commits enviados ao Git criam deployments. O redeploy de Preview foi concluído com estado **Ready**, comprovando a continuidade da integração Git–Vercel neste teste.

No GitHub não existia workflow nem execução de GitHub Actions. Foi adicionado `.github/workflows/ci.yml`, que roda em `push` e `pull_request` para `main`, com permissões somente de leitura, cancelamento de execuções obsoletas e três portas de qualidade: `pnpm typecheck`, `pnpm test` e `pnpm build`.

| Verificação local que o CI reproduz | Resultado |
|---|---:|
| `pnpm typecheck` | Aprovado |
| `pnpm test` | Aprovado após tornar a chamada externa da Sympla opt-in |
| `pnpm build` | Aprovado; apenas avisos existentes de compatibilidade de `flex-start`/`flex-end` |
| Workflow pré-existente no GitHub | Não havia |
| Proteção da branch `main` | Indisponível no plano atual para este repositório privado (HTTP 403 informado pelo GitHub) |

A credencial atualmente configurada no GitHub é uma credencial de integração e não expõe escopos de token pessoal. O envio do novo workflow será tentado no commit final; se o GitHub rejeitar a modificação de `.github/workflows/`, será necessário usar uma credencial com permissão `workflow` ou equivalente no GitHub App.

O commit `2d800fd` foi aceito em `main` pelo GitHub, incluindo `.github/workflows/ci.yml`. A primeira execução do workflow **Continuous Integration** foi criada automaticamente por evento `push` na branch `main` (run `3208605…`) e estava em andamento na primeira consulta. Esse resultado será acompanhado antes do encerramento da validação.

As duas primeiras execuções revelaram problemas de configuração, que foram corrigidos sem reduzir a cobertura do workflow: a primeira não encontrou o executável `pnpm`; a segunda declarou uma versão genérica que conflitava com `pnpm@10.4.1` em `package.json`. O workflow agora usa `pnpm/action-setup@v4` sem duplicar a versão, permitindo que a configuração declarada pelo projeto seja a fonte de verdade.

A terceira execução encontrou uma dependência indevida do teste unitário da Sympla em `SYMPLA_API_TOKEN`, que não existe no runner do GitHub. O teste agora injeta um token fictício somente durante seus casos unitários e mantém as verificações de API externas como opt-in. A porta local completa — typecheck, testes e build — passou após essa correção. A próxima execução GitHub no commit de correção é a confirmação remota pendente.

A execução final do workflow, vinculada ao commit `4f19e45`, concluiu com sucesso: **run 32086315545**, em aproximadamente 1 minuto e 13 segundos. As etapas de instalação, typecheck, testes e build foram aprovadas. O GitHub CLI ainda informa que a credencial de consulta não possui `checks:read` para baixar anotações, mas isso não afetou a execução nem o status verde do workflow.
