# Runbook — validação de ambientes e promoção segura

**Escopo:** homologação e produção da ATLETICA FSA.  
**Princípio:** validar nomes, escopos e efeitos; nunca expor valores de segredos em terminal, print, issue, commit ou documento.

## 1. Pré-condições de qualquer release

| Item | Homologação | Produção |
|---|---|---|
| Branch | Feature/correção aprovada para preview | `main` somente após evidência de homologação |
| Banco | Projeto `gfnbdjdqumewspvfxicl` | Projeto `tbxihkzuyzszrfxqmleq` |
| Pagamento | Credenciais sandbox somente quando o ensaio for autorizado | `ACCEPT_NEW_CHECKOUTS=false` até aprovação comercial; preservar `PROCESS_PAYMENT_EVENTS=true` enquanto houver obrigações a conciliar |
| Dados | Fixtures identificáveis e descartáveis | Nenhuma fixture, seed ou teste de escrita |
| E-mail | Endereço de teste autorizado | Nenhum disparo de teste sem autorização |
| Migração | Aplicada, verificada e reversível | Somente com janela, backup e aprovação da Presidência |

## 2. Checklist de variáveis no painel Vercel

A pessoa responsável pelo projeto Vercel deve revisar os nomes e o escopo da variável, sem abrir ou copiar valores. A tabela abaixo é a referência de presença e separação; campos podem ter denominações equivalentes apenas quando o contrato em `src/lib/env.ts` também for atualizado e testado.

| Grupo | Variáveis esperadas | Preview/homologação | Produção | Verificação |
|---|---|---|---|---|
| Supabase | URL, publishable key, secret key, JWKS | Projeto de homologação | Projeto de produção | Conferir host/projeto, não o segredo |
| Aplicação | `NEXT_PUBLIC_APP_URL`, URL pública e feature gates | URL do preview/homologação | `https://atleticafsa.site` | Callback e links de e-mail apontam ao ambiente correto |
| Cron | `CRON_SECRET` | Valor isolado | Valor isolado | Rota sem token retorna negação; token nunca é exibido |
| E-mail | `RESEND_API_KEY`, `EMAIL_FROM` | Sandbox/destinatário de teste | Domínio aprovado | Ensaio controlado e log sanitizado |
| Mercado Pago | access token, webhook secret e gates | Somente sandbox se aprovado | Mantidos com criação fechada e drain ativo | Conferir `ACCEPT_NEW_CHECKOUTS=false`; manter `PROCESS_PAYMENT_EVENTS=true` para obrigações existentes; `PAYMENTS_ENABLED` é apenas fallback legado por flag ausente |
| Sympla e Slack | token Sympla e webhook de alerta | Ambiente de teste quando disponível | Produção | Health e alertas não misturam ambientes |
| Proteção de abuso | `MEMBER_INTEREST_ABUSE_HASH_SECRET` | Valor isolado | Valor isolado | Não depende de valor fraco/fallback não documentado |

## 3. Sequência de validação em homologação

1. Confirmar que o commit da branch candidata possui `pnpm typecheck`, `pnpm test`, `pnpm build` e `pnpm audit --prod` aprovados.
2. Abrir o preview e testar rotas públicas, login, destino pós-login, RBAC e rotas protegidas sem usar dados pessoais reais.
3. Quando houver banco, aplicar migration somente após revisar SQL, plano de rollback, grants, RLS, funções `SECURITY DEFINER` e impacto em dados existentes.
4. Executar testes positivos pelo papel/worker autorizado e testes negativos por `anon` e `authenticated`. Todos os testes de grant precisam provar que a chamada indevida é negada antes de retornar dados ou alterar estado.
5. Para webhook, usar somente sandbox e assinatura de teste. Exercitar assinatura inválida, replay, evento fora de ordem, timeout e resposta do provedor divergente.
6. Para e-mail, utilizar endereço autorizado, uma única mensagem e uma falha simulada. Registrar apenas ID/estado/timestamp, nunca corpo, token ou dados pessoais completos.
7. Para cron e health, invocar rota com credencial de teste, registrar heartbeat e confirmar os estados de falha e recuperação sem gerar spam de alerta.
8. Anexar à pull request os IDs dos testes, commit, URL de preview, checks aprovados e plano de rollback.

## 4. Sequência de promoção para produção

1. A PR deve estar aprovada, com CI verde e evidência de homologação anexada.
2. Alterações de banco, e-mail, cron, credenciais, função privilegiada, pagamento ou dados exigem aprovação explícita da Presidência e janela de mudança.
3. Fazer checkpoint/backup lógico aplicável antes de migration destrutiva ou alteração de grants/RLS.
4. Publicar a revisão e observar logs, health, outbox, dead letters e alertas por uma janela definida no plano da PR.
5. Executar apenas smoke tests não mutáveis em produção: páginas públicas, resposta da configuração pública, redirect de rota protegida e métricas de erro.
6. Se houver erro de segurança, perda de autorização, duplicidade operacional ou resposta financeira inesperada, interromper a promoção, desativar o fluxo pelo gate aplicável e iniciar rollback documentado.

## 5. Sinais de bloqueio imediato

| Sinal | Ação obrigatória |
|---|---|
| `ACCEPT_NEW_CHECKOUTS=true` sem ensaio sandbox e aprovação | Fechar somente a criação de novos checkouts e não continuar a promoção; não interromper a conciliação de obrigações existentes. |
| Migration sem rollback ou sem teste de RLS/grant | Bloquear merge/promoção. |
| Token, senha, chave privada ou payload pessoal em diff/log | Revogar/rotacionar segredo, remover exposição e abrir incidente. |
| Teste toca host/projeto de produção | Abortar suite, analisar impacto e corrigir guardrail antes de reexecutar. |
| Health crítico, dead letter crescente ou runtime error novo | Classificar incidente antes de nova release. |
| CI verde com teste ignorado recém-adicionado | Bloquear até justificar formalmente ou tornar o teste executável. |

## 6. Rollback

O rollback não é um `git reset` em produção. Para código, restaurar o deployment anteriormente saudável pela ferramenta de hosting após decisão registrada. Para banco, usar migration reversível previamente testada ou procedimento de restauração aprovado; não executar SQL destrutivo improvisado. Para credenciais, trocar o segredo no painel, invalidar o anterior e executar smoke test do serviço afetado. Para pagamento, o rollback padrão é preservar `ACCEPT_NEW_CHECKOUTS=false`; manter `PROCESS_PAYMENT_EVENTS=true` até conciliar as obrigações já criadas, salvo incidente financeiro que exija pausa controlada e decisão explícita.

## Referências

[1]: ../especificacao-qualidade-e-entrega-2026-08-19.md "Especificação de qualidade, testes e entrega segura"  
[2]: ../auditoria-integral-plataforma-2026-08-19.md "Auditoria integral da plataforma"  
[3]: ../../src/lib/env.ts "Contrato de variáveis de ambiente"
