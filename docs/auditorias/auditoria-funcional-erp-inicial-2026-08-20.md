# Auditoria funcional inicial do ERP e dos módulos operacionais

**Data:** 20 de agosto de 2026  
**Escopo:** validação técnica não destrutiva a partir da `main` publicada no commit `ed85c93`, complementada por smoke test no Preview da PR #18.
**Limite deliberado:** não foram criados pedidos, eventos, inscrições, contas, e-mails ou transações. Não houve alteração de preço, estoque, dados de Production, nem ativação de pagamentos.

## Síntese

> A base de aplicação foi aprovada em testes, tipagem e build de produção. As rotas públicas responderam normalmente e as superfícies operacionais recusaram o acesso não autenticado conforme esperado. O Preview da PR #18 também apontou ao Supabase de homologação e passou pelas verificações públicas e de boundary. A auditoria autenticada em homologação permanece aberta porque este executor não possui as credenciais isoladas exigidas para criar a massa descartável de QA e executar as transições de domínio contra esse ambiente.

| Frente | Evidência executada | Resultado | Próxima verificação necessária |
|---|---|---|---|
| Qualidade de código | `pnpm test`, `pnpm typecheck`, build de produção | **Aprovado**: 56 arquivos de teste, 191 testes; 3 testes ignorados intencionalmente; tipagem e build concluídos | Manter a mesma bateria em cada PR funcional |
| Rotas públicas | `GET /`, `/loja`, `/eventos`, `/login`, `/redefinir-senha` | **Aprovado**: todas responderam HTTP 200 | Revisão visual e acessibilidade em Preview antes de mudanças de UI |
| Configuração pública | `GET /api/public-config` | **Aprovado**: HTTP 200; resposta não contém chave de serviço e o Preview aponta para `gfnbdjdqumewspvfxicl` | Preservar a separação por ambiente em cada nova branch de QA |
| Limite de acesso | `GET /admin`, `/erp`, `/ods` sem sessão | **Aprovado**: a checagem local retornou HTTP 307 e o Preview redirecionou visualmente `/admin` para `/login` | Exercitar a matriz autenticada de papéis `admin`, `backoffice`, `caixa` e `cliente` |
| Proteção de cron | `GET /api/cron/integration-health` sem autorização | **Aprovado**: HTTP 401, sem acionar o cron, tanto localmente quanto no Preview | Validar o caminho autorizado apenas com `CRON_SECRET` isolado em homologação |
| QR e concorrência | Contratos de pedidos, tickets e QR na suíte; script dedicado disponível | **Parcial**: contratos aprovados; execução contra banco isolado ainda não realizada | Fornecer somente `TEST_SUPABASE_*` do projeto de homologação/exclusivo de testes e executar o ensaio com limpeza automática |
| Checkout e POS | Contratos de gate, webhook, idempotência e Point na suíte | **Parcial**: contratos aprovados; liquidação sandbox ainda pendente | Criar identidades, produto e pedido exclusivos de homologação e efetuar aprovação sandbox isolada |
| Eventos, ODS, CRM e Tabelas | Contratos de eventos, check-in, ODS, permissões, CRM e construtor na suíte | **Parcial**: contratos aprovados; fluxos autenticados ainda pendentes | Executar roteiro com conta QA descartável em Preview de homologação |
| E-mail, Sympla, Slack e cron | Contratos de outbox, integração, alertas e cron na suíte | **Parcial**: contratos aprovados; ensaios externos controlados pendentes | Executar outbox e alerta de degradação/recuperação com destinatário e canal autorizados |

## Comandos e resultados rastreáveis

O comando de qualidade foi executado a partir da `main` local e concluiu sem falhas:

```text
pnpm test
pnpm typecheck
env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  -u SUPABASE_SECRET_KEY NODE_ENV=production pnpm build
```

A suíte cobriu, entre outras, as frentes de recuperação de senha, RBAC, automações, grants de banco, e-mail transacional, CRM, eventos e check-in, cron e alertas, retirada QR, pagamentos Mercado Pago, catálogo, configuração Supabase, construtor de tabelas e APIs de exportação. A especificação de qualidade define os critérios de aceite correspondentes para esses módulos.[1]

As sondagens em `next start` foram somente de leitura. As cinco rotas públicas retornaram HTTP 200. As rotas `/admin`, `/erp` e `/ods` retornaram HTTP 307 com destino `/login`; o health check de integração retornou HTTP 401 sem credencial. Esse comportamento atende às exigências de autorização anônima para superfícies administrativas e cron.[1]

O Preview da PR #18 foi publicado em estado `READY` após a aprovação do workflow de integração contínua. Com um acesso temporário de leitura da própria Vercel, a landing, a loja e a agenda de eventos renderizaram sem escrita. A rota de configuração confirmou o projeto de homologação; `/admin` encaminhou para `/login`; e `/api/cron/integration-health` respondeu `Não autorizado.` sem execução do job. Nenhuma inscrição, produto, item de carrinho, pedido, pagamento, dado pessoal ou configuração foi criado, editado ou excluído nesse smoke test.

## Risco e ordem de execução

| Prioridade | Pendência do checklist | Situação | Dependência para avançar |
|---:|---|---|---|
| P0 | Auditoria autenticada de ERP, ODS, pedidos, eventos, automações e integrações | Em andamento, com base técnica aprovada | Conta QA e Preview isolado de homologação |
| P0 | QA automatizado externo de homologação | Preview isolado identificado e smoke passivo concluído; o roteiro de linha de comando ainda não recebeu bypass no executor | `VERCEL_AUTOMATION_BYPASS_SECRET` no executor seguro para repetir integralmente o roteiro automatizado |
| P0 | Concorrência real de QR | Script com criação e limpeza automática disponível | Variáveis `TEST_SUPABASE_*` exclusivamente não produtivas |
| P1 | Outbox e alertas de recuperação/degradação | Contratos aprovados | Destinatário externo temporário e canal Slack autorizado |
| P1 | Liquidação Mercado Pago sandbox | Contratos e gate aprovados | Sessão compradora sandbox isolada; sem uso de Production |
| P2 | Catálogo institucional | Não iniciado | Preços, estoques, SKUs, categorias e mídia existente aprovados explicitamente pela gestão |
| Externa | OAuth Microsoft, Apple e telefone/SMS | Bloqueada por design | Registros dos provedores, CAPTCHA e orçamento aprovados |

## Conclusão operacional

Não foi identificada falha de compilação, tipagem, rota pública, boundary de autenticação ou rejeição de cron no recorte executado. Isso **não substitui** os fluxos autenticados e com persistência, que continuam como pendências abertas e serão realizados somente em ambiente de homologação, com dados identificáveis como teste e limpeza prevista.

## Referências

[1]: ../especificacao-qualidade-e-entrega-2026-08-19.md "Especificação de qualidade e entrega — cenários de ERP, pagamentos, eventos, ODS, e-mail e cron"
