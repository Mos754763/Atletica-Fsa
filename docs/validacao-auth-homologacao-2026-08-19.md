# Evidências de validação — segurança de conta em homologação

**Data:** 19 de agosto de 2026  
**Escopo:** prova de conceito Supabase Auth nativa, sem alterações de RLS, perfis ou dados de produção.

## Verificação visual inicial

| Rota | Resultado | Observação |
|---|---|---|
| `/conta/seguranca` — tema claro | Carregada | Estrutura de Centro de Segurança, resumo de proteção, MFA TOTP, senha, telefone e privacidade renderizados. |
| `/conta/seguranca` — sessão local sem cookie Supabase | Esperado | A interface informa `Auth session missing!`; a sessão do navegador conectado não é compartilhada com o ambiente local temporário. |
| `/conta/seguranca` — tema escuro | Ajustado e validado | A correção passou a aplicar superfícies, texto e campos semânticos no tema escuro; o contraste foi restaurado. |

## Configuração encontrada no Supabase de homologação

| Item | Estado observado | Impacto na validação |
|---|---|---|
| MFA TOTP | **Enabled** | O backend de homologação está apto a receber a inscrição de um aplicativo autenticador. |
| MFA por telefone | Desabilitado; o painel informa que depende do plano Pro | Não será implementado ou testado até haver decisão de plano e fornecedor SMS. |
| Google OAuth | **Disabled** | O teste do preview retornou `400 validation_failed: Unsupported provider: provider is not enabled`. O fluxo TOTP não pode ser testado por Google até a reconfiguração do provedor. |
| Azure/Microsoft OAuth | Disabled | Depende de registro no Microsoft Entra ID e credenciais do aplicativo. |
| Apple OAuth | Disabled | Depende de conta Apple Developer, Services ID e chave de assinatura. |

O painel de provedores confirmou que e-mail está habilitado, enquanto Google, Azure e Apple permanecem desabilitados no projeto `atletica-fsa-homolog`. Portanto, a indisponibilidade do Google não é falha do novo redirecionamento MFA: é uma configuração pendente no ambiente de homologação.

Ao abrir o provedor Google, os campos **Client IDs** e **Client Secret** estavam vazios e a ativação estava desligada. Não houve alteração nem salvamento. Para habilitá-lo com segurança, será necessário registrar o callback `https://gfnbdjdqumewspvfxicl.supabase.co/auth/v1/callback` no cliente OAuth Web do Google e inserir as credenciais geradas no projeto de homologação.

## Correção de guarda de sessão

O primeiro acesso direto ao preview, sem uma sessão válida no navegador, renderizou a estrutura do Centro de Segurança e exibiu a mensagem `Auth session missing!`. A rota foi corrigida para validar o usuário no servidor com `auth.getUser()` e redirecionar a `/login?next=/conta/seguranca` quando não houver sessão. O cliente também possui uma guarda redundante para o caso de expiração após a renderização. A correção passou por `pnpm typecheck`, `pnpm test` (**149 testes aprovados, 3 ignorados**) e `pnpm build`; a confirmação no preview atualizado ainda está pendente.

O preview reconstruído confirmou o redirecionamento para `/login?next=/conta/seguranca`. O formulário de login também foi ajustado para preservar esse destino durante a etapa MFA, em vez de devolver o usuário sempre à página principal da conta.

## Teste autenticado

Em 19 de agosto, foi feita uma tentativa controlada de login por e-mail no preview de homologação, usando a conta administrativa registrada para o projeto. O Supabase de homologação respondeu **`Invalid login credentials`**. Isso confirma que a credencial informada não está válida nessa instância — normalmente porque o usuário ainda não foi criado nela ou porque a senha é diferente — e não indica falha no redirecionamento nem no código MFA. Nenhuma conta, senha, perfil, política RLS ou dado de produção foi alterado durante a verificação.

## Teste TOTP com conta isolada

Foi criada exclusivamente na instância de homologação a conta auto-confirmada `mfa.homolog.20260819@atleticafsa.site`, sem perfil institucional, papel operacional, acesso ao ERP ou relação com produção. O login por e-mail e senha no preview `atletica-79cwku437` foi concluído e preservou corretamente o destino protegido: `/conta/seguranca`.

O Centro de Segurança carregou dados reais dessa sessão: nível AAL1, um provedor `E-mail e senha`, nenhum telefone confirmado e nenhum fator MFA inscrito. Isso confirma que o painel consulta a sessão Supabase real, não dados estáticos, e que o redirecionamento de login e a guarda do painel funcionam no preview de homologação.

A ação **Adicionar aplicativo** foi acionada com sucesso para a conta isolada. O Supabase emitiu o QR Code, a chave temporária de inscrição e o campo de confirmação de seis dígitos; a chave não foi registrada neste documento nem será mantida após o teste. Isso valida a etapa de inscrição TOTP até o desafio de confirmação.

O código TOTP temporário foi confirmado com êxito. O preview exibiu a confirmação de que a sessão foi elevada para autenticação em duas etapas e iniciou a atualização da lista de fatores. Apesar de a ação do navegador ter retornado um timeout transitório, a consulta subsequente comprovou que o Supabase processou a confirmação; não houve duplicação de inscrição.

Na atualização seguinte, o painel exibiu o fator **Autenticador FSA · verificado**, o resumo **MFA configurado** e a mensagem **Sessão atual validada em duas etapas**. A conta de ensaio permaneceu com o papel `cliente`, demonstrando que a inscrição MFA não alterou o RBAC nem os dados institucionais do perfil.

O encerramento de sessão da conta de ensaio retornou a navegação para a landing page. A inspeção manual do novo login até a tela de desafio pós-logout ficou pendente por instabilidade intermitente da extensão do navegador ao interagir com os campos abaixo da dobra; a lógica de redirecionamento e de exigência AAL1 → AAL2 permanece coberta por testes unitários e deve ser repetida antes da promoção a produção.

Ao fim do ensaio, a conta `mfa.homolog.20260819@atleticafsa.site` foi removida do schema `auth` da instância **gfnbdjdqumewspvfxicl**. Não foram criados usuários, fatores, provedores ou registros de MFA em produção.

## Resultado automatizado

Após a implementação e a validação visual, a branch de homologação passou por `pnpm typecheck`, `pnpm test` e `pnpm build` com sucesso. A suíte registrou **150 testes aprovados e 3 intencionalmente ignorados**; os cinco novos cenários de `mfa-assurance.test.ts` cobrem a exigência de AAL2 e a apresentação segura dos tipos de fator. O build Next.js 16.3.1 listou corretamente as rotas dinâmicas `/auth/mfa` e `/conta/seguranca`.

## Limites confirmados desta rodada

O TOTP está habilitado na homologação e foi validado integralmente até AAL2. Google, Microsoft e Apple não foram ativados nessa instância porque não existem credenciais OAuth de homologação configuradas. A verificação por telefone permanece propositalmente desativada: a FSA ainda precisa escolher e configurar um provedor SMS, controles CAPTCHA, limites de envio e o orçamento de mensagens. Nenhuma dessas pendências bloqueia o uso do Centro de Segurança ou MFA TOTP.

## Limitações conhecidas nesta rodada

O próximo passo é acionar **Adicionar aplicativo**, escanear o QR Code emitido e validar o código TOTP para elevar a sessão a AAL2. Após isso, será feito um novo login da mesma conta para comprovar o desafio obrigatório pós-login. Ao final, o fator e a conta temporária serão removidos da homologação.
