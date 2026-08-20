## Objetivo

<!-- Descreva o resultado observável e vincule a issue. -->

Closes #

## Prioridade e risco

- [ ] P0 — segurança, pagamento, autorização, perda/corrupção de dado ou indisponibilidade crítica
- [ ] P1 — operação essencial ou integração degradada
- [ ] P2 — qualidade, governança ou experiência importante
- [ ] P3 — melhoria planejada
- [ ] Esta mudança não altera preço, estoque ou dados produtivos sem aprovação explícita.
- [ ] `PAYMENTS_ENABLED` não foi habilitado.

## Alterações e impacto

<!-- Explique mudanças em rotas, banco, eventos, integrações e UX. -->

## Dados, segurança e rollback

- [ ] Não há segredo, token, credencial, dado pessoal ou URL privada no diff.
- [ ] RLS, grants e funções `SECURITY DEFINER` foram revisados quando a mudança toca banco.
- [ ] A migration é idempotente ou falha de modo diagnóstico; seu plano de rollback está documentado abaixo.
- [ ] O código não usa service role em cliente ou sem guarda de identidade e papel.
- [ ] Variáveis foram conferidas somente por nome/escopo; valores não foram copiados para esta PR.

### Plano de rollback

<!-- Obrigatório para banco, webhook, cron, variável, pagamento e integração. -->

## Testes e homologação

- [ ] Testes unitários e/ou de contrato foram atualizados.
- [ ] Casos negativos, concorrência, replay e limite de taxa foram tratados quando aplicável.
- [ ] `pnpm typecheck` passou.
- [ ] `pnpm test` passou sem novo teste ignorado.
- [ ] `pnpm build` passou.
- [ ] `pnpm audit --prod` não adicionou vulnerabilidade conhecida.
- [ ] Preview/homologação foi validado quando há interface, banco ou integração.

### Evidências

<!-- URLs de preview, IDs de testes, resumo de logs sanitizados e imagens quando necessário. -->

## Operação

- [ ] Métrica, log, alerta, dead letter ou runbook foram atualizados quando há cron/webhook/outbox.
- [ ] A promoção para produção exige aprovação explícita quando há migration, P0, dados, pagamentos ou variáveis.
- [ ] O escopo desta PR é único e não mistura correção P0 com refatoração/UI sem relação.
