# Gate MVP pós-merge — 2026-09-04

## Estado verificado

- Branch local: `chore/mvp-release-gate`.
- Base exata de `main`: `3c29c20ce01a3ad01d956d7f5b2e592fb42e5fdb`.
- `gh pr list --repo Mos754763/Atletica-Fsa --state open ...` retornou `[]`; não há PR aberto.
- PRs recentes confirmados como `MERGED`, com CI, E2E público, Vercel e Preview Comments aprovados: #36 (`e6ef75e21b0e28f1d26b589c2620e9b7edf4cdbb`), #38 (`3c29c20ce01a3ad01d956d7f5b2e592fb42e5fdb`), #39 (`0587e3d0062474c2c6889bb168aa0bd520c6512a`), #40 (`11ba072935efddc7c7c47c4021989be97ecf772f`), #41 (`8f19de95fdeada285754dd956b90616db4480cd6`) e #42 (`fae1ea7c99f1a802225f991b060ff547697eda51`).

## Production

O deployment `dpl_5tgQhZ2cruuDH7WguxBPa9ohVzQB` está `READY`, alvo `production`, no SHA exato de `main`. A verificação passiva registrou `/login` HTTP 200, GET do webhook HTTP 405 (`Allow: POST`) e a atestação HML HTTP 404 (`not_preview`) em Production. O build terminou sem falha e a consulta de controle não encontrou novas ordens, pagamentos, eventos de webhook ou movimentos de estoque após o merge. A evidência externa sanitizada está em `evidence/pr38-webhook-screenshot-audit.md` (fora deste repositório; caminho de evidência, sem link relativo quebrado).

## Checkbox reconciliado

Foi fechado somente o item de liquidação sandbox end-to-end em `todo.md`:

`Executar liquidação end-to-end com pagamento sandbox aprovado após criar produto, pedido e pagador exclusivos de homologação`

A seção “Operator-driven R$1 sandbox checkout and final reconciliation” da evidência externa comprova o pagamento sandbox `177203869926` aprovado em HML, uma ordem de 100 centavos em `pago`, exatamente um evento de webhook e uma baixa de estoque; o replay byte-identical retornou `duplicate` sem nova liquidação. O controle de Production permaneceu sem mutações financeiras ou de banco.

## Trabalho restante

### Dependências externas ou adiadas

POS Mercado Pago, Microsoft OAuth, Apple OAuth, SMS/MFA, configuração de provedor e entrega externa de e-mail continuam condicionados a dispositivo, credenciais, fornecedor, orçamento ou autorização específicos. Esses itens permanecem desmarcados.

### Segurança e operações

Continuam exigindo evidência própria: publicação controlada com `PAYMENTS_ENABLED=false` nos escopos Production e Preview; remediação do estado Troubleshoot/`400020` do Turnstile; mecanismo e evidência Playwright no Preview protegido; ensaio HML da outbox; rotações de segredos; e os acompanhamentos pós-merge da PR #34. A ausência de prova exata mantém esses checkboxes inalterados.

### Melhorias pós-MVP

Lotes de pré-venda, visões Kanban/Calendário/Galeria, novas regras de automação, otimização de imagens e demais ampliações operacionais continuam fora deste gate e desmarcados.

## Política de custo e próxima ação

Nenhum código executável, dependência, migration, configuração, segredo, CI ou sistema externo foi alterado nesta etapa; a mudança limita-se a este registro e a um checkbox comprovado do backlog. Não foi feito deploy, merge ou chamada financeira. Preserve a infraestrutura atual sem contratar plano, add-on ou serviço pago; mantenha pagamentos de Production desabilitados até autorização separada.

A próxima ação executada foi a **current-main zero-cost smoke matrix**, somente leitura e sem dados financeiros. Critérios de aceite:

1. páginas públicas retornam HTTP 200;
2. páginas privadas redirecionam para login sem vazar conteúdo protegido;
3. GET do webhook retorna HTTP 405;
4. `?attest=hml-settlement` em Production retorna HTTP 404;
5. não há erros de runtime no recorte verificado;
6. não há mutações financeiras ou de banco em Production.

## Resultado da matriz zero-cost

Executada contra `https://atleticafsa.site` no mesmo `main` e deployment descritos acima:

| Fronteira | Resultado |
| --- | --- |
| `/`, `/loja`, `/eventos`, `/login` | HTTP 200 |
| `/conta`, `/admin`, `/ods`, `/erp` sem sessão | HTTP 307 para `/login` |
| GET `/api/payments/mercado-pago/webhook` | HTTP 405, `Allow: POST`, corpo vazio |
| GET com `?attest=hml-settlement` em Production | HTTP 404, `not_preview` |
| Erros de runtime Vercel, janela de 30 minutos | nenhum |
| Supabase Production desde o merge da PR #38, observado em `2026-09-04T16:18:12.549436Z` | 0 ordens, 0 pagamentos, 0 eventos de webhook e 0 movimentos de estoque |

Todos os seis critérios foram atendidos sem sessão, POST, pagamento, webhook, escrita no banco ou alteração externa.

## Próximo gate zero-cost

Auditar somente nomes e escopos das flags de pagamento na Vercel, sem revelar valores, para reconciliar a pendência histórica de publicação controlada. Critérios de aceite:

1. registrar os escopos efetivos de `ACCEPT_NEW_CHECKOUTS`, `PROCESS_PAYMENT_EVENTS` e do fallback legado `PAYMENTS_ENABLED` em Production e Preview;
2. confirmar que configurações de HML continuam restritas ao Preview/branch e que Production não aponta para o Supabase de homologação;
3. não ler, copiar ou registrar valores de segredos;
4. decidir com evidência se o item histórico de publicação pode ser atualizado ou deve permanecer aberto.

## Auditoria de metadados Vercel/Supabase — PR #43

A inspeção de metadados da Vercel, sem revelar valores, confirmou os seguintes nomes e escopos:

- `ACCEPT_NEW_CHECKOUTS` existe em Production, no Preview global e em um override de branch para `fix/payment-drain-mode`.
- `PROCESS_PAYMENT_EVENTS` existe em Production e no Preview global.
- O fallback legado `PAYMENTS_ENABLED` existe em Production e no Preview global.
- O contrato do código é individual: cada flag nova sobrescreve `PAYMENTS_ENABLED` quando presente; `PAYMENTS_ENABLED` só é usado como fallback quando a flag nova correspondente está ausente.

O deployment Preview atual da PR #43, no host `atletica-wv4q6upu7-moises-faustino-rodrigues-s-projects.vercel.app`, está `READY` no SHA `89b4ef7086bacefe09dc0c92274e60eab4695654`. A atestação HML no Preview retornou HTTP 200, com `vercelEnvironment preview` e referência de projeto `gfnbdjdqumewspvfxicl`. A mesma atestação em Production (`atleticafsa.site`) retornou HTTP 404, `not_preview`.

A Vercel não reportou erros de runtime nas últimas 2 horas, incluindo as rotas de pagamento. O projeto Supabase HML `gfnbdjdqumewspvfxicl` está `ACTIVE_HEALTHY`; no baseline somente leitura de `2026-09-04 20:03:28+00`, havia 3 orders, 2 payments, 6 eventos de webhook e 2 movimentos de inventário, com exatamente uma linha de payment e uma linha de webhook para a referência sandbox `177203869926`.

Nenhum valor de flag foi revelado; portanto, esta auditoria somente de metadados não afirma valores booleanos. Nenhuma variável, deployment, segredo, linha de banco ou configuração de Production foi alterada. O override de branch é apenas candidato a limpeza futura; não há afirmação de que seja seguro removê-lo automaticamente.
