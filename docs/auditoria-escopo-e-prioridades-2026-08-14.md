# Auditoria de escopo e fila de execução — ATLETICA FSA

> **Data de referência:** 14 de agosto de 2026. Esta auditoria confronta os documentos recebidos (`requisitos-plataforma-atletica(1).md` e `plano-de-execucao-atletica.md`) com o repositório, o esquema efetivamente validado e a configuração versionada. O banco real contém **14 tabelas do domínio, 30 políticas RLS e RLS habilitado nas 14 tabelas previstas**.

## Conclusão executiva

A plataforma atual já é uma **base operacional funcional de primeira geração**: landing institucional, catálogo, autenticação, convite simples de membros, pedidos autenticados, Checkout Pro, webhook assinado, ODS, eventos/check-in, KPIs e proteção global por papéis estão implementados. A linha de base técnica está verde em tipos, testes e build de produção.

Contudo, ela ainda **não cumpre o novo núcleo administrativo descrito nos requisitos**. O projeto atual usa quatro papéis globais (`admin`, `cozinha`, `caixa` e `cliente`), enquanto o escopo aprovado exige setores administráveis, presidente, diretores por setor, permissões granulares, auditoria, lixeira, automações configuráveis e Construtor de Tabelas. A loja também precisa de endurecimento antes de receber pagamentos reais: a política do host atual e os controles transacionais de estoque/retirada ainda não satisfazem os critérios de lançamento.

> A documentação oficial da Vercel informa que o plano Hobby é destinado a uso pessoal e não comercial. Por isso, pagamentos reais devem permanecer bloqueados até que a atlética migre para um plano comercial compatível ou outro provedor validado.[1]

## Estado real por domínio

| Domínio | Estado atual confirmado | Comparação com o escopo | Situação |
|---|---|---|---|
| Fundação | Next.js 15, TypeScript, Supabase, RLS, Storage, Vercel Cron, GitHub e testes Vitest. | Atende a base tecnológica. Falta CI versionada e checklist de release. | Parcial |
| Identidade e conteúdo | Landing responsiva, identidade FSA, gestão, setores visuais, loja e motion design. | Atende a vitrine; setores são conteúdo fixo, não dados administráveis. | Parcial |
| Autenticação | E-mail/senha, Google OAuth, callback seguro e conta do usuário. | Atende o login. Falta onboarding de presidente e modelo organizacional novo. | Parcial |
| RBAC | Papéis globais admin, Backoffice, caixa e cliente; guardas server-side e RLS. | Não atende presidente/diretor/membro/visualizador por setor e por ação. | Lacuna alta |
| Pessoas | Convite, alteração de papel global e proteção do último admin. | Não há setor, diretor, histórico de movimentação ou matriz de visibilidade. | Lacuna alta |
| Loja | Catálogo, imagem, carrinho, pedido autenticado, Checkout Pro e webhook. | Não há variações, pré-venda/lotes, retirada por código/QR, status separados, compra convidada ou CSV. | Lacuna alta |
| Estoque | Campo de saldo e tabela de movimentos; criação inicial registra movimento. | A baixa de estoque por pagamento aprovado e a reserva concorrente ainda não são transacionais. | Bloqueador comercial |
| ODS | Fila em tempo real e transição condicional de status. | Atende o preparo básico; precisa ser conectado ao status de retirada e ao novo modelo comercial. | Parcial |
| Eventos | CRUD, inscrição, código de check-in, status e lembrete em cron. | Sem lotes de ingresso, QR de ingresso, transferência ou controle financeiro por evento. | Parcial |
| E-mail | Resend transacional com deduplicação simples. | Sem templates editáveis, outbox com prioridade, limite diário e retentativa. | Lacuna média |
| Automações | Tabela de jobs e cron de lembretes codificado. | Não há regras editáveis, condições, ações, logs ou teste pelo painel. | Lacuna alta |
| Auditoria/lixeira | Histórico de status de pedidos e rastros pontuais. | Não há trilha genérica antes/depois, soft delete, restauração ou expurgo de 30 dias. | Lacuna alta |
| Construtor de Tabelas | Não implementado. | É a Fase 2 inteira: metadados, campos, registros JSONB, visões e permissões. | Não iniciado |
| Qualidade | Tipagem, 26 testes automatizados, build de produção e RLS verificados. | Falta CI, testes de integração com Sandbox MP e UAT operacional. | Parcial |

## Lista de urgência e ordem de execução

| Prioridade | Entrega | Por que vem agora | Como e onde será executada | Critério de aceite |
|---|---|---|---|---|
| **P0 — bloquear risco** | Bloqueio explícito de pagamento real e checklist de hospedagem comercial | Evita que uma conta de teste aceite dinheiro em ambiente incompatível. | Variável server-side, rotas de checkout, `.env.example` e guia de release. | Checkout real permanece indisponível até ativação explícita pós-checkpoint. |
| **P0 — bloquear regressão** | CI no GitHub | O plano exige tipos, testes e build em todo push. | Workflow em `.github/workflows/ci.yml`. | Pull request/push falha ao quebrar tipo, teste ou build. |
| **P0 — dinheiro** | Projeto transacional de estoque, pagamento e entrega | Previne dupla baixa, venda acima do estoque e mistura de estado financeiro com retirada. | Nova migração Supabase, funções/RPC atômicas, checkout e webhook. | Pagamento aprovado idempotente baixa estoque uma vez e cria retirada rastreável. |
| **P1 — governança** | Setores, vínculo de pessoas, presidente e permissões por escopo | É a fundação de autonomia dos cinco setores e do Construtor. | Migração, RLS, serviços de autorização e painel de membros. | Diretor de Marketing não vê estoque até receber concessão explícita. |
| **P1 — rastreabilidade** | Auditoria, soft delete e lixeira | Evita perda de dados e atende a governança definida. | Tabelas de auditoria/lixeira, triggers e telas administrativas. | Criar, editar, apagar e restaurar preserva autor e histórico. |
| **P1 — loja MVP** | Variações, pré-venda/lotes, retirada com código/QR, CSV e estorno registrado | Completa o modelo comercial definido antes do lançamento. | Esquema de produto/lote/pedido, APIs, CMS e área de retirada. | Compra de teste nos dois modelos conclui e é conciliada. |
| **P2 — comunicação** | Outbox de e-mail, templates e fila | Mantém comunicação confiável sem travar venda ou evento. | Tabelas de fila, cron seguro, Resend e painel de templates. | Transacionais têm prioridade e falhas são reprocessáveis. |
| **P2 — automação** | Motor de regras e keep-alive | Substitui cron rígido por regras auditáveis de setor. | Regras, execuções, avaliador, cron e interface em três passos. | Regra criada no painel executa e registra log sem deploy. |
| **P3 — produtividade** | Construtor de Tabelas Nível B | Leva autonomia às áreas sem permitir alterar regras financeiras. | Metadados JSONB, campos, registros, visões e permissões. | Cada setor cria tabela, campos, registro e visão de lista. |
| **P4 — eventos e POS** | Ingressos por lote, QR, transferência e pedidos em evento | Depende do núcleo, estoque, pagamento e decisões de evento. | Módulos de ingresso, check-in QR e integração POS. | Ingresso pago gera QR único e check-in idempotente. |
| **P5 — fechamento** | Financeiro, UX final, UAT e release | Consolida dados reais e transforma o produto em operação sustentada. | Relatórios, documentação, roteiro de treinamento e teste de produção. | Primeira venda monitorada sem incidente e operação capaz de seguir sem suporte técnico. |

## Dependências externas e decisões que não serão inventadas

| Código | Decisão ou configuração | Efeito no desenvolvimento |
|---|---|---|
| D1 | Plano de hospedagem comercial ou provedor alternativo antes de cobrar. | Bloqueia `PAYMENTS_ENABLED=true` e a primeira venda real. |
| P1 | Desconto/prioridade de sócio e critério de identificação. | Bloqueia regras de preço de associado. |
| P2 | Pré-venda: sinal integral, mínimo de peças e estorno se não atingir. | Bloqueia política final de lote e refund. |
| P3 | Prazo/local de retirada e destino de item não retirado. | Define SLA, lembretes e encerramento de pedido. |
| P4 | Variações além de tamanho. | Define modelo de SKU/variante do catálogo. |
| P5 | Compra convidada ou obrigatoriedade de conta. | Define os dados mínimos e o fluxo de checkout. |
| P7 | Domínio/remetente de e-mail institucional. | Bloqueia a confiabilidade total do Resend/Supabase SMTP. |
| P8 | Regra fiscal aplicável ao CNPJ. | Bloqueia qualquer promessa de nota fiscal automática. |
| P9 | Titular e operadores da conta Mercado Pago. | Necessário para token, webhook, usuários Sandbox e POS. |
| P11 | Três tabelas e três automações de cada diretor. | Guia a primeira entrega do Construtor e do motor de regras. |
| P13 | Setor proprietário da loja. | Define escopo e gestão operacional da loja. |

Nenhuma dessas decisões impede as entregas P0 de proteção e qualidade nem a base técnica de P1. As partes que dependem de uma regra de negócio específica permanecerão parametrizadas ou bloqueadas de forma segura até a diretoria deliberar.

## Roteiro imediato em execução

O ciclo começou pela linha P0. Primeiro serão adicionados o bloqueio de pagamento real por configuração, a integração contínua e a documentação de gate comercial. Depois será feita a mudança de modelo de estoque/pagamento/retirada com migração aditiva, testes unitários e validação no Supabase. Somente após a segurança comercial estar consistente serão introduzidos setores e permissões granulares; isso evita refazer todo o controle de acesso duas vezes.

## Referências

[1]: https://vercel.com/docs/plans/hobby "Vercel — Hobby Plan"
