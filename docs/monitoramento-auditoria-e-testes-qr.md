# Monitoramento de auditoria e testes de QR

**Data:** 14 de agosto de 2026  
**Autor:** Manus AI

## Onde cada evidência é registrada

O sistema possui dois trilhos de auditoria diferentes. O Construtor de Tabelas registra alterações estruturadas em `audit_logs`; pedidos, retirada e mudanças de status registram seu histórico em `order_status_history`. O QR de retirada é um UUID secreto e **não deve ser exibido em relatórios, SQL operacional, logs de aplicação ou atendimento**. A análise deve usar o identificador do pedido, horários, operador e o tipo de evento.

| Necessidade | Fonte correta | Acesso esperado |
|---|---|---|
| Inclusão, edição, exclusão e restauração no Construtor | `public.audit_logs` | Presidência pelo ERP ou administradores no SQL Editor. |
| Preparação, pedido pronto, renovação de QR e retirada | `public.order_status_history` | Equipe operacional autorizada; administradores no SQL Editor. |
| Saúde de QRs ativos e expiração | `public.orders`, sem selecionar `pickup_qr_token` | Backoffice/Presidência com consulta administrativa. |
| Duplicidade de retirada | `public.orders` e `public.order_status_history` | Backoffice/Presidência. |

> A política de RLS de `audit_logs` restringe a leitura à Presidência. A leitura por SQL Editor usa uma conexão administrativa e deve ser concedida somente a pessoas autorizadas. [1]

## Consultas operacionais recomendadas

As consultas abaixo podem ser executadas no **Supabase SQL Editor** por administrador autorizado. Elas intencionalmente não retornam o token nem o payload do QR.

### 1. Auditoria recente do Construtor de Tabelas

```sql
select
  a.created_at,
  s.name as setor,
  p.full_name as ator,
  a.entity_type,
  a.entity_id,
  a.action,
  a.before_json,
  a.after_json
from public.audit_logs a
left join public.sectors s on s.id = a.sector_id
left join public.profiles p on p.id = a.actor_id
where a.created_at >= now() - interval '30 days'
order by a.created_at desc
limit 200;
```

Use os campos `before_json` e `after_json` somente para investigar uma alteração concreta. Para um painel diário, prefira exibir ação, setor, entidade, operador e horário, evitando expor conteúdo de registros desnecessariamente.

### 2. Histórico de renovação e confirmação de retirada

```sql
select
  h.created_at,
  o.order_number,
  h.status,
  p.full_name as operador,
  h.note
from public.order_status_history h
join public.orders o on o.id = h.order_id
left join public.profiles p on p.id = h.changed_by
where h.note in (
  'QR Code de retirada renovado pelo Backoffice.',
  'Retirada confirmada por QR Code opaco de uso único.'
)
  and h.created_at >= now() - interval '30 days'
order by h.created_at desc
limit 200;
```

Uma renovação fora do padrão pode ser investigada pelo operador e pedido relacionados. Uma segunda leitura do QR não cria uma nova retirada: a RPC retorna o sinal `already_picked_up` e preserva uma única linha de histórico de entrega.

### 3. Fila de retiradas pronta, expirada e inconsistente

```sql
select
  o.order_number,
  o.ready_at,
  o.pickup_qr_expires_at,
  case
    when o.pickup_qr_token is null then 'sem_token_ativo'
    when o.pickup_qr_expires_at <= now() then 'token_expirado'
    else 'token_ativo'
  end as situacao_qr
from public.orders o
where o.fulfillment = 'retirada'
  and o.status = 'pronto'
  and o.picked_up_at is null
order by o.ready_at asc;
```

O resultado é uma fila operacional segura: apresenta o estado do QR sem expor seu valor. Pedidos `sem_token_ativo` ou `token_expirado` devem ser revisados e, se ainda estiverem elegíveis, renovados pelo Backoffice.

### 4. Indicadores diários de uso do QR

```sql
select
  date_trunc('day', h.created_at)::date as dia,
  count(*) filter (where h.note = 'Retirada confirmada por QR Code opaco de uso único.') as retiradas_confirmadas,
  count(*) filter (where h.note = 'QR Code de retirada renovado pelo Backoffice.') as qrs_renovados
from public.order_status_history h
where h.created_at >= current_date - interval '30 days'
group by 1
order by 1 desc;
```

Um aumento de renovações em relação a retiradas pode indicar dificuldade de leitura, telas desatualizadas nos celulares, prazo de retirada inadequado ou tentativa de atendimento com QR antigo. A análise deve sempre começar pelos eventos e operadores, nunca pelo valor do token.

## Rotina de monitoramento

O Backoffice deve verificar a fila de pedidos prontos no início e no encerramento de cada turno. A Presidência deve revisar semanalmente os eventos de auditoria do Construtor e a proporção entre renovações e retiradas. Um pedido com token expirado não deve ser entregue por leitura antiga; o operador deve renovar o QR pela ação autorizada, pedir atualização da página do cliente e ler o novo QR.

Se houver suspeita de acesso indevido, preserve os horários, pedido, usuário operador e notas do histórico. Em seguida, revogue a associação ou grant do usuário na área Organização e investigue a sessão de autenticação. Não copie o QR, token ou dados de pagamento para canais de atendimento.

## Matriz recomendada de testes automatizados

Os testes devem ser organizados em três níveis: unitários para normalização, integração PostgreSQL/Supabase para transações e RLS, e ponta a ponta para os fluxos reais da interface. A base de testes deve ser separada da base de produção; não use pedidos reais para validar concorrência ou expiração.

| Área | Cenário | Nível | Critério de aceite |
|---|---|---|---|
| Retirada | Construção do payload e normalização de `FSA:PICKUP:<uuid>` | Unitário | Prefixo, espaços e caixa são normalizados; texto não UUID é rejeitado. |
| Retirada | Pedido muda de `em_preparo` para `pronto` | Integração | Trigger cria UUID e expiração; QR não é criado para consumo local. |
| Retirada | QR válido em pedido pronto | Integração | RPC retorna `entregue`, grava operador/horário, limpa token e cria uma linha de histórico. |
| Retirada | Segunda leitura do mesmo QR | Integração | Exatamente uma chamada tem `already_picked_up = false`; as demais retornam `true`, sem novo histórico. |
| Retirada | Duas chamadas concorrentes | Integração com duas conexões | O bloqueio `FOR UPDATE` mantém uma só entrega e nenhum estado intermediário. [2] [3] |
| Retirada | QR vencido, inválido, de outro pedido, de consumo local ou de pedido não pronto | Integração | Cada caso é recusado e o pedido permanece inalterado. |
| Retirada | Renovação | Integração | Novo token substitui o anterior; QR anterior é recusado e o novo é aceito. |
| Retirada | Papel não autorizado e atualização direta | RLS/segurança | Cliente e caixa não confirmam retirada; `UPDATE orders SET status='entregue'` é bloqueado para `authenticated`. |
| Retirada | Área Minha conta e ODS | Ponta a ponta | Cliente vê QR somente enquanto elegível; Backoffice confirma e a tela muda para retirada concluída. |
| Check-in | Leitura de QR `FSA:TICKET:<uuid>` de ingresso emitido | Unitário e integração | Normalização aceita o prefixo; a RPC grava um único check-in. |
| Check-in | Releitura e duas leituras concorrentes | Integração com duas conexões | Um único `checked_in_at`/operador é persistido; resposta posterior informa uso anterior. |
| Check-in | Ingresso pendente, cancelado, transferido de forma inválida ou de evento diferente | Integração | Operação é recusada sem marcar presença. |
| Check-in | Operador sem função de evento | RLS/segurança | Usuário não autorizado não lê dados nem executa check-in. |
| Check-in | Tela de evento administrativo | Ponta a ponta | Scanner/entrada manual aceita QR válido e apresenta erro compreensível para inválido, vencido ou duplicado. |

## Estrutura de execução no repositório

Os testes atuais em Vitest já cobrem a construção e normalização do token de retirada em `src/lib/orders/pickup-token.test.ts`, bem como regras puras de ingressos em `src/lib/events/tickets.test.ts`. A próxima camada deve incluir uma suíte de integração que execute as RPCs com uma instância Supabase de teste e usuários JWT representando cliente, caixa, Backoffice e administrador.

Uma implementação recomendada é criar três comandos separados:

```bash
pnpm test                     # regras puras e componentes sem banco
pnpm test:integration          # RPCs, RLS, triggers e concorrência em Supabase de teste
pnpm test:e2e                  # conta do cliente, ODS e check-in em navegador isolado
```

O pipeline de CI deve executar `typecheck`, testes unitários e integração em cada pull request. Os testes E2E podem rodar em ambiente de pré-publicação, com banco efêmero, segredos exclusivos de teste e dados criados/descartados a cada execução.

## Teste concorrente executável

O repositório inclui `scripts/test-qr-concurrency.mjs`, que cria dois usuários temporários e dados mínimos **somente no projeto Supabase de testes**. Ele abre três conexões PostgreSQL: uma mantém o bloqueio da linha, enquanto duas conexões autenticadas chamam a mesma RPC simultaneamente. Antes de liberar o bloqueio, o script confirma que ambas as chamadas permanecem aguardando; depois, exige uma única mutação final e uma segunda resposta idempotente.

O script se recusa a executar se `TEST_SUPABASE_PROJECT_REF` apontar para a referência de produção ou se a impressão digital da conexão de teste coincidir com `SUPABASE_DB_URL`. Ele não registra tokens, QR Codes ou segredos no console e remove os pedidos, eventos, inscrições e usuários efêmeros no encerramento.

```bash
export TEST_SUPABASE_PROJECT_REF="seu-projeto-supabase-de-teste"
export TEST_SUPABASE_URL="https://seu-projeto-supabase-de-teste.supabase.co"
export TEST_SUPABASE_SECRET_KEY="chave-de-servico-exclusiva-de-teste"
export TEST_SUPABASE_DB_URL="postgresql://..."
pnpm test:integration:qr-concurrency
```

Antes da primeira execução, aplique no projeto de teste exatamente as migrações presentes em `supabase/migrations/`. O comando não deve ser executado com variáveis da Vercel de produção, nem contra a base que recebe pedidos reais.

## Referências

[1]: https://supabase.com/docs/guides/database/postgres/row-level-security "Supabase — Row Level Security"

[2]: https://www.postgresql.org/docs/current/explicit-locking.html "PostgreSQL — Explicit Locking"

[3]: https://www.postgresql.org/docs/current/sql-select.html "PostgreSQL — SELECT / FOR UPDATE"
