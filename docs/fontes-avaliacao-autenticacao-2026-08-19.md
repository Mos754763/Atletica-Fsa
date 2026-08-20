# Fontes e evidências — avaliação de autenticação

**Coleta:** 19 de agosto de 2026. Estas notas registram apenas fatos externos consultados para embasar a decisão de arquitetura.

## Clerk

A página oficial de preços informa que o plano **Hobby** é gratuito, oferece até 50.000 usuários mensais retidos por aplicação, três assentos no dashboard, interface pré-construída e APIs para cadastro, login e perfil, domínio personalizado, logs com retenção de um dia e sessão fixa de sete dias. MFA, autenticação por SMS, passkeys e duração de sessão personalizável são recursos do plano **Pro**, a partir de US$ 20/mês quando cobrado anualmente.

O mesmo quadro indica que o recurso B2B incluído sem adicional permite até 20 membros por organização, com papéis Admin e Member, permissões personalizadas e convites. O plano também inclui proteções contra força bruta e bots, bloqueio de endereços temporários e exportação de dados do usuário.

A documentação de estratégias de login afirma que login e verificação por telefone em produção, passkeys e MFA exigem plano pago; esses recursos podem ser experimentados gratuitamente em desenvolvimento. Para SMS, países devem estar explicitamente habilitados, e apenas Estados Unidos e Canadá estão habilitados por padrão. Para o cenário brasileiro da FSA, isso significa configuração explícita do Brasil, além de cobrança por mensagem no plano pago.

Fontes: [Clerk Pricing](https://clerk.com/pricing) e [Clerk sign-up and sign-in options](https://clerk.com/docs/guides/configure/auth-strategies/sign-up-sign-in-options).

## Supabase Auth

A documentação oficial do Supabase lista password, magic link, OTP, login social, SSO, Apple, Azure/Microsoft e provedores OAuth/OIDC customizados. O Supabase Auth emite JWTs e integra suas sessões com RLS no Postgres. A documentação também apresenta MFA por TOTP ou telefone; no caso de telefone, usa APIs de enrollment, challenge e verify para elevar a sessão de AAL1 a AAL2.

O guia de Azure/Microsoft requer o registro de um aplicativo no Microsoft Entra ID, a callback URL do Supabase e o escopo `email`; alerta para validar domínios de e-mail por meio do claim `xms_edov`. O guia da Apple requer a rotação do segredo web a cada seis meses e alerta que o nome completo não é fornecido em todas as respostas OAuth.

O Supabase expõe APIs para listar e remover fatores de MFA e permite fazer cumprir o nível de garantia (`aal`) no front-end, no servidor e no RLS. O login por telefone requer provedor SMS compatível e a documentação recomenda rate limit e CAPTCHA. O número do usuário só pode ser alterado em sessão autenticada e deve ser confirmado por OTP.

Fontes: [Supabase Auth](https://supabase.com/docs/guides/auth), [MFA](https://supabase.com/docs/guides/auth/auth-mfa), [Phone Login](https://supabase.com/docs/guides/auth/phone-login), [Azure/Microsoft](https://supabase.com/docs/guides/auth/social-login/auth-azure) e [Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple).

## Integração Clerk–Supabase

Clerk e Supabase documentam uma integração nativa de autenticação de terceiros. O token de sessão do Clerk é aceito pelo Supabase e as políticas RLS precisam passar a usar as claims desse token, em especial o `sub` para a identidade e as claims de organização/papel quando aplicáveis. A integração não sincroniza automaticamente usuários do Clerk para tabelas do Supabase; dados adicionais exigem webhooks ou um mecanismo próprio de provisionamento.

A abordagem anterior baseada no compartilhamento de segredo JWT e em JWT templates está obsoleta. A documentação atribui a descontinuação ao risco de compartilhar o segredo JWT com terceiro, à rotação com potencial indisponibilidade e à latência adicional de gerar token. Uma migração para Clerk, portanto, deve usar a integração nativa e exigir revisão de RLS, mapeamento de identificadores e reconciliação de perfis existentes.

Fontes: [Clerk — Supabase integration](https://clerk.com/docs/guides/development/integrations/databases/supabase) e [Supabase — Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk).
