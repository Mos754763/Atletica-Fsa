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

## Limitações conhecidas nesta rodada

Não foi possível concluir o cadastro de TOTP contra a instância de homologação porque a sessão autenticada da aplicação publicada não está disponível no servidor local temporariamente exposto. A validação funcional será executada após o deploy de preview/homologação e a habilitação do MFA no painel Supabase.
