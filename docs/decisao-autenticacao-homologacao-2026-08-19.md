# Decisão de arquitetura — identidade e segurança de conta

**Data:** 19 de agosto de 2026  
**Ambiente para implantação inicial:** homologação  
**Decisão recomendada:** manter o **Supabase Auth** como provedor de identidade e evoluir a experiência de conta com uma camada própria da ATLETICA FSA.

## Conclusão

O plano gratuito do Clerk é excelente para acelerar uma interface de login, cadastro e perfil. Porém, ele **não atende sozinho ao requisito da FSA** de autenticação em dois fatores e verificação de telefone em produção: esses recursos pertencem ao plano Pro, que parte de US$ 20/mês na cobrança anual, e o SMS tem custo adicional. O plano Hobby também limita a operação a três assentos de dashboard e mantém logs por apenas um dia. [1]

Como a FSA já usa Supabase Auth, possui perfis e RBAC ligados a esse modelo e necessita de Google, Microsoft, Apple, telefone e MFA, a substituição por Clerk criaria uma segunda fonte de identidade e exigiria uma migração sensível de RLS, identificadores de usuário e provisionamento de perfis. A integração oficial não sincroniza usuários Clerk com tabelas Supabase automaticamente; os dados adicionais exigem webhook ou sincronização própria. [2] [3]

> **Decisão proposta:** não migrar o login existente para Clerk agora. Em homologação, construir o **Centro de Segurança da Conta FSA** sobre Supabase Auth e integrar provedores gradualmente. A opção Clerk Pro permanece viável no futuro caso a direção priorize terceirizar a experiência de identidade e aceite seu custo recorrente.

## Comparação aplicada ao cenário FSA

| Critério | Clerk Hobby | Clerk Pro | Supabase Auth evoluído (recomendado) |
|---|---|---|---|
| Login, cadastro e perfil | Pronto, com UI pré-construída | Pronto, com UI pré-construída | Já existente; UI FSA será construída sobre APIs oficiais |
| Google OAuth | Sim | Sim | Já configurado |
| Microsoft e Apple | Possíveis conforme provedor | Possíveis conforme provedor | Suportados oficialmente, com configuração de cada fornecedor [4] |
| MFA em produção | Não | Sim | TOTP e telefone suportados [5] |
| Verificação por SMS em produção | Não | Sim, com países/cobrança configurados | Sim, com provedor SMS, limite de taxa e CAPTCHA [6] |
| RLS e perfis atuais | Exige revisão/migração | Exige revisão/migração | Mantém JWT, `auth.uid()`, perfis e políticas existentes |
| Custo incremental | Sem custo, mas sem MFA/SMS de produção | A partir de US$ 20/mês + SMS | Sem novo fornecedor de identidade; SMS continua ter custo do provedor |
| Dependência operacional | Alta, com segundo plano e dashboard | Alta, com segundo plano e dashboard | Uma única plataforma de identidade já presente |

## Arquitetura alvo: Centro de Segurança da Conta FSA

O painel será adicionado à área `/conta`, sem alterar a fonte de verdade de papéis. A tabela `profiles` e as regras de RBAC continuarão a definir acesso a ERP, Backoffice, caixa e Presidência; identidade e credenciais continuam no Supabase Auth.

| Bloco da tela | Função | Requisito técnico |
|---|---|---|
| Dados pessoais | Exibir e atualizar nome, avatar e e-mail confirmado | `auth.updateUser()`; e-mail exige confirmação |
| Senha | Criar ou alterar senha e acionar recuperação | `updateUser()` e fluxo de recovery existente |
| Logins conectados | Exibir Google, Microsoft e Apple vinculados | Leitura das identities da sessão; não afirmar vínculo que não exista |
| MFA TOTP | Configurar, confirmar, usar e remover autenticador | APIs `mfa.enroll`, `challenge`, `verify` e `unenroll` [5] |
| Telefone | Cadastrar ou atualizar número e confirmar OTP | Provedor SMS, CAPTCHA e limites por usuário/IP [6] |
| Sessão | Mostrar sessão atual, horário de acesso e ação de sair | Sessão Supabase atual e `signOut()`; sessões globais exigem fluxo administrativo próprio |
| Privacidade | Histórico de consentimento, link para termos e pedido de exclusão/exportação | Aproveitar a matriz LGPD e rotas administrativas existentes |

Para ações de alto impacto — mudança de e-mail, telefone, senha, MFA, permissões e pagamentos — o sistema deve exigir sessão recente ou segundo fator quando MFA estiver habilitado. O nível de garantia do usuário pode ser aplicado tanto na interface quanto no servidor e nas políticas RLS. [5]

## Ordem segura de implantação em homologação

1. **MFA TOTP para papéis operacionais.** Esta é a primeira entrega porque não depende de SMS, reduz risco de tomada de conta e pode ser testada sem dados de clientes.
2. **Centro de Segurança da Conta.** Adicionar o painel sem duplicar login ou RBAC, com estados de carregamento, mensagens acessíveis e logs de auditoria.
3. **Microsoft OAuth.** Registrar aplicativo no Microsoft Entra ID, informar a callback de homologação e limitar o fluxo ao escopo `email`. O claim `xms_edov` deve ser avaliado se a FSA for restringir domínios verificados. [4]
4. **Apple OAuth.** Configurar somente quando houver conta Apple Developer, identificador de serviço e proprietário responsável pela rotação semestral do client secret. A aplicação não deve depender do nome retornado, pois ele pode não voltar após o primeiro consentimento. [7]
5. **Telefone e MFA por SMS.** Escolher formalmente o provedor, habilitar Brasil, configurar CAPTCHA, limites e orçamento por mensagem. Não deve existir ativação silenciosa de cobrança.
6. **Avaliação final de Clerk.** Reabrir a decisão apenas se a direção aprovar Clerk Pro e o custo recorrente; então realizar uma migração separada com inventário de IDs, webhooks, RLS e rollback.

## Pré-requisitos externos

| Capacidade | Dado/ação necessária | Quem fornece |
|---|---|---|
| Microsoft OAuth | `client_id`, `client_secret` e registro da callback de homologação no Entra ID | Administração Microsoft/FSA |
| Apple OAuth | Apple Developer, Service ID, Team ID, Key ID e chave privada de assinatura | Titular da conta Apple Developer |
| SMS | Escolha de fornecedor, conta faturável, credenciais e regra de gasto | Direção financeira e responsável técnico |
| MFA TOTP | Habilitação do provedor MFA no Supabase de homologação | Administração Supabase/FSA |
| Clerk, se escolhido | Aprovação explícita de plano Pro para MFA/SMS de produção e chaves do projeto Clerk | Direção FSA |

## Critérios de aceite da homologação

O usuário de teste deve conseguir entrar por senha e Google sem regressão. Um membro operacional deve conseguir cadastrar TOTP, validar código, acessar uma página protegida que exige AAL2 e remover o fator apenas após revalidação. Microsoft e Apple serão considerados prontos somente após login real no ambiente de homologação e retorno correto à área autenticada. Telefone só será aceito após OTP válido, proteção CAPTCHA e logs sem número exposto em texto claro.

## Referências

[1]: https://clerk.com/pricing "Clerk Pricing"  
[2]: https://clerk.com/docs/guides/development/integrations/databases/supabase "Clerk — Integrate Supabase with Clerk"  
[3]: https://supabase.com/docs/guides/auth/third-party/clerk "Supabase — Clerk third-party authentication"  
[4]: https://supabase.com/docs/guides/auth/social-login/auth-azure "Supabase — Azure/Microsoft login"  
[5]: https://supabase.com/docs/guides/auth/auth-mfa "Supabase — Multi-factor authentication"  
[6]: https://supabase.com/docs/guides/auth/phone-login "Supabase — Phone login"  
[7]: https://supabase.com/docs/guides/auth/social-login/auth-apple "Supabase — Apple login"
