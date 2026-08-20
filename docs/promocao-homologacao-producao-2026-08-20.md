# Decisão de promoção — homologação para Production

**Data:** 2026-08-20
**Escopo:** correções homologadas nas branches de segurança, saúde da Sympla, contratos de e-mail e composição de login.

## Decisão executiva

As quatro revisões abertas contra `main` estão tecnicamente aptas a seguir para a etapa de aprovação: todas aparecem com estado de merge **CLEAN** no repositório. A promoção deve ocorrer por código versionado e, quando aplicável, por migração idempotente; nenhum dado, usuário, pedido, pagamento, token, variável ou configuração de homologação deve ser copiado para Production. Essa regra mantém a separação de ambientes e preserva a trilha de auditoria já estabelecida.[1]

> **Decisão:** aprovar a promoção em ondas, começando pelo endurecimento de grants. A execução de merge e da migração produtiva fica condicionada à aprovação explícita da Presidência no registro da mudança, à verificação dos gates abaixo e à confirmação de que `PAYMENTS_ENABLED=false` permanece em Production.

| Ordem | Revisão | Decisão | Dependência e validação posterior |
|---:|---|---|---|
| 1 | [PR #1 — grants de funções privilegiadas][2] | **Promover com migração coordenada** | Aplicar primeiro `20260820100000_harden_privileged_function_grants.sql` em Production e confirmar que `anon`, `authenticated` e `PUBLIC` não possuem `EXECUTE`; somente `service_role` permanece autorizado. |
| 2 | [PR #2 — health check Sympla][3] | **Promover após a PR #1** | Não requer dados de negócio. Validar uma chamada autenticada da rota cron com o segredo já rotacionado e confirmar que a própria execução não entra no cálculo de saúde. |
| 3 | [PR #3 — contratos de e-mail outbox][4] | **Promover após a PR #2** | Trata-se de cobertura e runbook. O envio externo controlado continua dependente de endereço de teste autorizado e não deve ser disparado durante o merge. |
| 4 | [PR #4 — composição de login][5] | **Promover após a PR #3** | Mudança de baixo risco, limitada a CSS, teste e documentação. Validar `/login` em desktop e mobile após o deploy. |
| 5 | `homolog/auth-security-poc-20260819` | **Preparar revisão separada; não ativar ainda** | O código de MFA pode ser promovido somente em revisão dedicada. Microsoft OAuth, Apple OAuth e o provedor de verificação por telefone exigem credenciais, callbacks e decisão operacional próprios antes de qualquer ativação. |

## Controles obrigatórios antes da janela

A autoridade aprovadora deve registrar a liberação da janela e a reversão prevista. O responsável técnico deve confirmar a integridade de cada commit, a presença de backup lógico recuperável, as variáveis de Production mascaradas no painel, e a inexistência de credenciais sandbox no escopo produtivo. O segredo de cron compartilhado durante testes anteriores deve ser rotacionado antes da execução e nunca deve ser incluído em documentos, comandos versionados, logs ou revisões.

| Controle | Critério de aceite |
|---|---|
| Pagamentos | `PAYMENTS_ENABLED=false` conferido no escopo **Production**; nenhuma chave sandbox copiada. |
| Banco | A migração de grants é revisada e aplicada uma única vez; nenhuma migração de dados, preço ou estoque integra esta janela. |
| Autenticação | Site URL, callbacks canônicos e Google OAuth de Production permanecem inalterados.[1] |
| Segredos | `CRON_SECRET` rotacionado e validado apenas por chamada autorizada; valores nunca são exibidos. |
| Reversão | Plano registrado: reverter apenas o merge correspondente; para a migração de grants, restaurar o grant mínimo somente se análise de incidente formal justificar. |
| Evidências | Typecheck, suíte, auditoria de dependências, build, SHA promovido e resultado da verificação pós-deploy anexados ao registro de mudança. |

## Procedimento de promoção

Primeiro, aplicar a migração de grants por meio da sessão administrativa oficial do Supabase Production, sem inserir nem alterar dados de domínio. Em seguida, executar consultas somente leitura de evidência sobre `information_schema.routine_privileges` ou o catálogo equivalente, confirmando os quatro papéis previstos para as três funções protegidas. Caso a evidência não corresponda ao esperado, a janela deve ser interrompida antes de qualquer merge.

Depois da evidência da migração, realizar os merges um por vez na ordem da tabela. Cada onda requer a conclusão do CI, o deploy da Vercel em estado pronto e uma verificação proporcional ao risco. As rotas cron não devem ser testadas com o segredo antigo; o teste de Sympla deve observar logs e heartbeats sem acionar sincronização financeira. A validação de login é pública e não deve usar senha, OAuth ou dados pessoais de terceiros.

Ao final, registrar os SHAs efetivamente promovidos, os horários de deploy, as consultas de evidência dos grants e qualquer observação operacional. Se um gate falhar, pausar a onda atual, não avançar para a próxima revisão e executar somente o procedimento de reversão aprovado para aquela mudança.

## Itens fora desta promoção

Os seguintes pontos continuam deliberadamente fora da janela: liquidação Mercado Pago sandbox aprovada, POS, ativação de pagamentos, teste de entrega externa da outbox, cópia de dados de homologação, alteração de preços ou estoque, e ativação de Microsoft OAuth, Apple OAuth ou telefone. A comparação anterior já estabeleceu que Production deve preservar URLs e dados próprios, enquanto credenciais sandbox e registros de ensaio ficam isolados.[1]

## Referências

[1]: ./auditoria-paridade-homologacao-production-2026-08-18.md "Auditoria de paridade — homologação e Production"
[2]: https://github.com/Mos754763/Atletica-Fsa/pull/1 "PR #1 — grants de funções privilegiadas"
[3]: https://github.com/Mos754763/Atletica-Fsa/pull/2 "PR #2 — health check Sympla"
[4]: https://github.com/Mos754763/Atletica-Fsa/pull/3 "PR #3 — contratos de e-mail outbox"
[5]: https://github.com/Mos754763/Atletica-Fsa/pull/4 "PR #4 — composição de login"
