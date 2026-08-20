# Inventário de ambientes e estratégia de consolidação

**Data da verificação:** 20 de agosto de 2026  
**Responsável pela análise:** Manus AI

## Síntese executiva

O repositório possui **cinco revisões abertas** contra `main` e uma sexta branch de homologação sem pull request. Todas as revisões abertas aparecem como `CLEAN` no GitHub; não há reviews de aprovação registrados. A `main` remota está no commit `5ef9657`, entregue com sucesso em Production, enquanto cada revisão aberta possui preview `READY` próprio na Vercel.[1] [2]

> **Decisão de controle:** as revisões não devem ser combinadas numa branch grande. Cada uma é pequena, reversível e possui escopo distinto. A consolidação deve manter uma revisão por merge, com a proteção de grants como pré-requisito técnico obrigatório antes das demais promoções.

## Estado confirmado por ambiente

| Ambiente | Evidência atual | Conteúdo confirmado | Observação operacional |
|---|---|---|---|
| **Production** | Commit `5ef9657`, deployment `READY`, domínio público e `/login` retornando HTTP 200 | Base atual de `main`, auditoria final de Production e proteções de abuso já promovidas | Não contém as PRs 1 a 5 nem a PoC MFA; o último deployment produtivo é o da `main`.[1] [3] |
| **Homologação / Preview** | Previews Vercel `READY` para PRs 1 a 5 | Grants endurecidos, correção Sympla, contratos de outbox, ajuste de login e ativos institucionais, cada qual em seu preview | Não é um banco ou conjunto de dados a ser copiado para Production; validações de código e ambiente são promovidas por merge e migração controlada.[2] |
| **Branch MFA de homologação** | `homolog/auth-security-poc-20260819`, seis commits não incorporados | PoC de MFA TOTP nativo, páginas de segurança, auditoria, especificação de qualidade e templates de governança | Não possui PR aberta e exige revisão própria; Microsoft, Apple e telefone continuam dependentes de credenciais e decisões externas. |

## Revisões abertas e decisão proposta

| Ordem | Revisão | Escopo | Situação | Decisão recomendada |
|---:|---|---|---|---|
| 1 | [PR #1][4] | Revoga `EXECUTE` público de três funções privilegiadas e preserva somente `service_role` | `CLEAN`; contém uma migration idempotente | **Promover primeiro**, mas somente depois de aplicar e evidenciar a migration de grants em Production. |
| 2 | [PR #2][5] | Evita autoavaliação do cron de health check Sympla, amplia testes e atualiza as actions de CI | `CLEAN`; preview `READY` | **Pronta para merge** após a PR #1. Não exige mudança de dados de negócio. |
| 3 | [PR #3][6] | Testes de contrato e runbook para ensaio controlado da outbox de e-mail | `CLEAN`; preview `READY` | **Pronta para merge** após a PR #2. O envio a e-mail externo continua fora do merge. |
| 4 | [PR #4][7] | Correção responsiva de layout de login, testes e runbook | `CLEAN`; preview `READY` | **Pronta para merge** após a PR #3. Validar `/login` em desktop e mobile pós-deploy. |
| 5 | [PR #5][8] | Ativos institucionais, fallbacks seguros de imagens e documento de promoção | `CLEAN`; preview `READY` | **Pronta para merge** após a PR #4. Não altera preço, estoque nem imagens já cadastradas no CMS. |

## Observabilidade de Production

Na janela de sete dias, a Vercel agrupou erros históricos de configuração do Supabase, validação de slug no Construtor de Tabelas, referência ambígua de `registration_id`, cache de esquema do cadastro de interesse e módulo `use server`. Todos ocorreram em deployments anteriores; uma consulta específica das últimas doze horas não retornou erros de execução. Portanto, esses incidentes devem ser tratados como **dívida de regressão a cobrir e reproduzir**, e não como bloqueio ativo sem evidência atual. O catálogo de pendências foi atualizado para exigir a reprodução controlada e testes antes de qualquer conclusão de correção.[2]

A verificação de regressão desta rodada confirmou quatro proteções: o novo contrato de configuração valida as variáveis públicas e privadas e garante que a rota de navegador não exponha a chave de serviço; a migration corretiva atual qualifica `ticket.registration_id`; o fluxo de interesse registra falha de persistência sem vazar dados pessoais; e o normalizador de slug transforma entradas de operador como “Quantidade mínima por pedido” em uma chave técnica válida. As quatro suítes selecionadas foram aprovadas. A falha de módulo `use server` permanece apenas como evento histórico de um deployment anterior e não foi observada na janela recente.[2]

## Branch sem revisão aberta

| Branch | Conteúdo | Encaminhamento |
|---|---|---|
| `homolog/auth-security-poc-20260819` | Seis commits: MFA TOTP, proteção de rotas, correções de retorno, auditoria, especificação e templates de governança | Abrir uma PR dedicada após rebase em `main`; separar a eventual ativação de provedores OAuth e telefone em mudanças posteriores com credenciais e testes específicos. |

## Sequência de consolidação e critérios de parada

O passo inicial é aplicar a migration `20260820100000_harden_privileged_function_grants.sql` em Production com acesso administrativo autorizado e checar os grants resultantes. A migration não modifica registros de domínio, preços ou estoque, mas altera permissões de funções sensíveis; portanto não deve ser executada junto com alterações não relacionadas.[4]

Depois dessa evidência, os merges podem seguir um por vez na ordem 1 → 2 → 3 → 4 → 5. Em cada etapa, o CI precisa concluir com sucesso, o deployment deve ficar `READY` e a verificação proporcional descrita na tabela deve ser anexada ao registro de mudança. O processo deve ser interrompido se qualquer deployment falhar, se `PAYMENTS_ENABLED` deixar de estar `false`, se uma verificação indicar regressão ou se a evidência dos grants não corresponder ao esperado.

Não é recomendado juntar as PRs em uma super-branch. Além de tornar rollback e diagnóstico mais difíceis, isso misturaria segurança de banco, cron, qualidade, CSS e conteúdo visual, aumentando o raio de impacto de uma falha. Após cada merge validado, a branch e o preview associados podem ser removidos do repositório e da Vercel, mantendo a `main` como linha de verdade.

## Próximo desenvolvimento prioritário

Depois da consolidação das revisões acima, o próximo item técnico bloqueado é a **validação controlada de entrega da outbox em homologação**, porque os contratos já foram escritos, mas falta um endereço externo expressamente autorizado. Em paralelo, a PR dedicada da PoC MFA deve ser preparada sem habilitar provedores ainda indisponíveis. Não há justificativa para ativar pagamentos, importar dados de homologação ou alterar preços e estoque nesta etapa.

## Referências

[1]: https://github.com/Mos754763/Atletica-Fsa/commit/5ef96575853018dafc9a5452e207ad8b8fa75cbc "Commit atual de Production pela main"
[2]: https://vercel.com/moises-faustino-rodrigues-s-projects/atletica-fsa "Projeto ATLETICA FSA na Vercel"
[3]: https://atleticafsa.site/ "Domínio público da ATLETICA FSA"
[4]: https://github.com/Mos754763/Atletica-Fsa/pull/1 "PR #1 — grants de funções privilegiadas"
[5]: https://github.com/Mos754763/Atletica-Fsa/pull/2 "PR #2 — health check Sympla"
[6]: https://github.com/Mos754763/Atletica-Fsa/pull/3 "PR #3 — contratos da outbox"
[7]: https://github.com/Mos754763/Atletica-Fsa/pull/4 "PR #4 — layout de login"
[8]: https://github.com/Mos754763/Atletica-Fsa/pull/5 "PR #5 — ativos institucionais"
