# Mercado Pago Point — Migration, Idempotência e Payloads

**Estado:** especificação técnica; **não aplicar diretamente em produção** antes de revisar a migration contra o schema atualizado e homologar com credenciais de teste.  
**Premissa:** a ATLETICA FSA já possui `orders`, `payments`, `order_status_history`, reservas de estoque e a função `settle_paid_order_inventory(uuid)`. O schema atual já prevê `mercado_pago_pos` em `public.payment_method`.

> O pagamento Point é iniciado por uma *order* do tipo `point`, atribuída a um terminal em modo PDV. A criação exige uma chave `X-Idempotency-Key` única e uma referência externa sem dados pessoais. [1]

## 1. Modelo relacional recomendado

| Tabela | Papel | Regra de idempotência |
| --- | --- | --- |
| `pos_terminals` | Cadastro controlado dos terminais Point permitidos. | Um `mercado_pago_terminal_id` por terminal local. |
| `pos_payment_attempts` | Uma tentativa de cobrança presencial para um pedido. | `idempotency_key`, `external_reference` e `provider_order_id` únicos; apenas uma tentativa aberta por pedido. |
| `payment_provider_events` | Caixa de entrada/auditoria dos webhooks. | `dedupe_key` único por transição de estado; `x_request_id` único quando informado. |
| `payments` existente | Registro financeiro aprovado/recusado. | `provider_reference` único, usando o ID do pagamento Point. |

A tentativa Point não substitui `payments`: ela registra o ciclo externo, inclusive antes de existir aprovação. `payments` continua sendo o lançamento financeiro normalizado do sistema.

## 2. Migration SQL proposta

> **Observação:** o bloco usa `security definer` apenas para operações internas acionadas pelo backend com `service_role`. Ele não deve receber permissões de `anon` ou `authenticated` e não deve ser exposto pelo cliente.

```sql
begin;

-- 1. Estados técnicos da tentativa Point. Não misturar estes estados com public.payment_status.
do $$ begin
  create type public.point_attempt_status as enum (
    'creating',          -- linha local criada, chamada externa ainda não concluída
    'created',           -- order aceita pelo Mercado Pago
    'at_terminal',       -- aguardando interação na Point
    'action_required',   -- terminal pediu confirmação/ação
    'processed',         -- pagamento confirmado pelo provedor e conciliado
    'failed',
    'cancelled',
    'expired',
    'refunded',
    'reconciliation_required'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.pos_terminals (
  id uuid primary key default gen_random_uuid(),
  mercado_pago_terminal_id text not null unique,
  store_id text,
  pos_id text,
  label text not null,
  active boolean not null default true,
  last_seen_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(trim(label)) between 1 and 120)
);

create table if not exists public.pos_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  terminal_id uuid not null references public.pos_terminals(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,

  -- Gerados no servidor. Nunca aceitar estes valores do browser.
  idempotency_key uuid not null unique,
  external_reference text not null unique,
  provider_order_id text unique,
  provider_payment_id text unique,

  amount_cents integer not null check (amount_cents >= 0),
  status public.point_attempt_status not null default 'creating',
  status_detail text,
  expires_at timestamptz,
  provider_snapshot jsonb not null default '{}'::jsonb,
  provider_created_at timestamptz,
  provider_updated_at timestamptz,
  processed_at timestamptz,
  cancelled_at timestamptz,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (
    external_reference ~ '^[A-Za-z0-9_-]{1,64}$'
  ),
  check (
    (status in ('processed', 'refunded') and provider_order_id is not null)
    or status not in ('processed', 'refunded')
  )
);

-- Impede duas cobranças presenciais simultâneas para o mesmo pedido.
create unique index if not exists pos_attempt_one_open_order_idx
  on public.pos_payment_attempts(order_id)
  where status in ('creating', 'created', 'at_terminal', 'action_required', 'reconciliation_required');

create index if not exists pos_attempt_order_created_idx
  on public.pos_payment_attempts(order_id, created_at desc);

create index if not exists pos_attempt_provider_order_idx
  on public.pos_payment_attempts(provider_order_id)
  where provider_order_id is not null;

create table if not exists public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'mercado_pago'),
  provider_order_id text not null,
  action text not null,
  provider_request_id text,

  -- SHA-256 hexadecimal de uma representação canônica sem segredos:
  -- provider | action | provider_order_id | status | payment_ids | version
  dedupe_key text not null check (dedupe_key ~ '^[a-f0-9]{64}$'),
  payload_hash text not null check (payload_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processing_started_at timestamptz,
  processed_at timestamptz,
  outcome text not null default 'received'
    check (outcome in ('received', 'processed', 'ignored_duplicate', 'rejected', 'reconciliation_required')),
  error_code text,
  error_detail text,

  unique (provider, dedupe_key)
);

create unique index if not exists payment_provider_events_request_id_idx
  on public.payment_provider_events(provider, provider_request_id)
  where provider_request_id is not null;

create index if not exists payment_provider_events_order_idx
  on public.payment_provider_events(provider, provider_order_id, received_at desc);

-- RLS defensivo: somente rotas do servidor com service_role acessam estas estruturas.
alter table public.pos_terminals enable row level security;
alter table public.pos_payment_attempts enable row level security;
alter table public.payment_provider_events enable row level security;
revoke all on public.pos_terminals, public.pos_payment_attempts, public.payment_provider_events
  from anon, authenticated;

create trigger pos_terminals_updated_at
before update on public.pos_terminals
for each row execute function public.set_updated_at();

create trigger pos_payment_attempts_updated_at
before update on public.pos_payment_attempts
for each row execute function public.set_updated_at();

-- 2. Reserva uma tentativa antes de chamar o provedor.
-- O valor é lido de orders; o browser não informa total.
create or replace function public.begin_point_payment_attempt(
  p_order_id uuid,
  p_terminal_id uuid,
  p_idempotency_key uuid,
  p_external_reference text,
  p_expires_at timestamptz,
  p_actor_id uuid
)
returns public.pos_payment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_terminal public.pos_terminals%rowtype;
  v_existing public.pos_payment_attempts%rowtype;
  v_attempt public.pos_payment_attempts%rowtype;
begin
  -- Repetir a mesma requisição retorna a mesma tentativa, sem nova cobrança externa.
  select * into v_existing
    from public.pos_payment_attempts
   where idempotency_key = p_idempotency_key;

  if found then
    if v_existing.order_id <> p_order_id or v_existing.terminal_id <> p_terminal_id then
      raise exception 'Chave de idempotência pertence a outra tentativa.' using errcode = '23505';
    end if;
    return v_existing;
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido não encontrado.' using errcode = 'P0002';
  end if;
  if v_order.status <> 'aguardando_pagamento' then
    raise exception 'Pedido não está elegível para cobrança presencial.' using errcode = 'P0001';
  end if;
  if v_order.total_cents <= 0 then
    raise exception 'Cobrança Point requer total positivo.' using errcode = 'P0001';
  end if;

  select * into v_terminal from public.pos_terminals
   where id = p_terminal_id and active = true for update;
  if not found then
    raise exception 'Terminal Point não está ativo.' using errcode = 'P0001';
  end if;

  insert into public.pos_payment_attempts (
    order_id, terminal_id, created_by, idempotency_key,
    external_reference, amount_cents, expires_at, status
  ) values (
    v_order.id, v_terminal.id, p_actor_id, p_idempotency_key,
    p_external_reference, v_order.total_cents, p_expires_at, 'creating'
  ) returning * into v_attempt;

  return v_attempt;
end;
$$;

-- 3. Vincula a resposta do POST /v1/orders. Pode ser chamada novamente após timeout,
-- sempre com a mesma idempotency_key, sem criar uma tentativa nova.
create or replace function public.bind_point_provider_order(
  p_attempt_id uuid,
  p_provider_order_id text,
  p_provider_payment_id text,
  p_provider_status text,
  p_provider_snapshot jsonb
)
returns public.pos_payment_attempts
language plpgsql
security definer
set search_path = public
as $$
declare v_attempt public.pos_payment_attempts%rowtype;
begin
  select * into v_attempt from public.pos_payment_attempts where id = p_attempt_id for update;
  if not found then
    raise exception 'Tentativa Point não encontrada.' using errcode = 'P0002';
  end if;

  if v_attempt.provider_order_id is not null and v_attempt.provider_order_id <> p_provider_order_id then
    raise exception 'Tentativa já vinculada a outra order do provedor.' using errcode = 'P0001';
  end if;

  update public.pos_payment_attempts
     set provider_order_id = p_provider_order_id,
         provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
         status = case lower(p_provider_status)
           when 'created' then 'created'::public.point_attempt_status
           when 'at_terminal' then 'at_terminal'::public.point_attempt_status
           else 'reconciliation_required'::public.point_attempt_status
         end,
         provider_snapshot = p_provider_snapshot,
         provider_updated_at = now(),
         updated_at = now()
   where id = p_attempt_id
  returning * into v_attempt;
  return v_attempt;
end;
$$;

-- A confirmação/recusa do webhook deve ser implementada em uma terceira função
-- (settle_point_webhook) após validar HMAC no TypeScript. Ela deve inserir primeiro
-- em payment_provider_events ON CONFLICT (provider, dedupe_key) DO NOTHING;
-- depois travar pos_payment_attempts FOR UPDATE, comparar valor/referência e:
--   processed -> inserir payments(status='aprovado') e chamar
--                public.settle_paid_order_inventory(order_id);
--   failed/cancelled/expired -> atualizar somente a tentativa, sem baixar estoque.

revoke all on function public.begin_point_payment_attempt(uuid, uuid, uuid, text, timestamptz, uuid)
  from public, anon, authenticated;
revoke all on function public.bind_point_provider_order(uuid, text, text, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.begin_point_payment_attempt(uuid, uuid, uuid, text, timestamptz, uuid)
  to service_role;
grant execute on function public.bind_point_provider_order(uuid, text, text, text, jsonb)
  to service_role;

commit;
```

## 3. Regras de processamento de webhook

O Mercado Pago envia webhooks via `POST` HTTPS e notifica criação/atualização de *orders* e processamento de transações Point. Os eventos relevantes incluem `order.processed`, `order.canceled`, `order.refunded`, `order.action_required`, `order.failed` e `order.expired`. [2]

| Etapa | Regra obrigatória |
| --- | --- |
| 1. Receber | Ler `x-signature`, `x-request-id`, os query parameters — em especial `data.id` — e o body bruto. |
| 2. Autenticar | Validar a assinatura com o segredo de Webhooks e o validador oficial HMAC. Não usar o body sem a validação. [2] |
| 3. Persistir | Calcular `payload_hash` e `dedupe_key`; inserir o evento com `ON CONFLICT DO NOTHING`. A duplicata deve retornar sucesso sem repetir estoque ou pagamento. |
| 4. Reconciliar | Buscar `GET /v1/orders/{id}` quando necessário e comparar `provider_order_id`, `external_reference`, total em centavos e IDs de pagamento. [2] |
| 5. Liquidar | Apenas `order.processed` com status/valor/referência coerentes cria/atualiza `payments` como `aprovado` e chama `settle_paid_order_inventory`. |
| 6. Responder | Retornar `200` ou `201` rapidamente depois de persistir/encaminhar o evento; o provedor espera até 22 segundos e pode reenviar falhas. [2] |

**Dedupe key recomendada:** SHA-256 de `mercado_pago|<action>|<data.id>|<data.status>|<ids de transactions.payments em ordem>|<version>`. O `x-request-id` deve ser guardado para rastreabilidade, mas a chave semântica evita repetir uma transição se o provedor reenviar com outro identificador de entrega.

## 4. Payloads de exemplo

### 4.1 Requisição do painel para o backend interno

O navegador **não envia** valor, referência externa, estado do pedido ou token do Mercado Pago. Ele apenas seleciona o pedido e o terminal previamente cadastrados.

```http
POST /api/admin/pos/orders
Authorization: Bearer <sessao-supabase>
Content-Type: application/json
Idempotency-Key: 9785a131-4c52-4a18-9a21-42d4d5685ac2

{
  "orderId": "62c4120b-7d39-4e69-a899-fb18e28d4df5",
  "terminalId": "30351731-8c28-47d9-a32a-af3898d53403"
}
```

O servidor valida papel `caixa`/`admin`, chama `begin_point_payment_attempt`, monta o total a partir de `orders.total_cents` e gera a referência `fsa-pos-62c4120b`.

### 4.2 Requisição do backend ATLETICA FSA para criar a *order* Point

```http
POST https://api.mercadopago.com/v1/orders
Authorization: Bearer <ACCESS_TOKEN_DE_TESTE_OU_PRODUCAO>
Content-Type: application/json
X-Idempotency-Key: 9785a131-4c52-4a18-9a21-42d4d5685ac2

{
  "type": "point",
  "external_reference": "fsa-pos-62c4120b",
  "expiration_time": "PT15M",
  "transactions": {
    "payments": [
      { "amount": "69.90" }
    ]
  },
  "config": {
    "point": {
      "terminal_id": "NEWLAND_N950__N950NCB801293324",
      "print_on_terminal": "no_ticket"
    }
  },
  "description": "Pedido ATLETICA FSA #1042"
}
```

O contrato oficial exige `type: "point"`, valor com duas casas decimais, `terminal_id` retornado pela API de terminais e `X-Idempotency-Key`. A expiração pode variar de 30 segundos a três horas. [1]

### 4.3 Resposta esperada à criação da *order*

```json
{
  "id": "ORD01JYH1Z1YJN4HZ8J3Q0RB3YP6D",
  "type": "point",
  "external_reference": "fsa-pos-62c4120b",
  "status": "created",
  "status_detail": "created",
  "expiration_time": "PT15M",
  "config": {
    "point": {
      "terminal_id": "NEWLAND_N950__N950NCB801293324",
      "print_on_terminal": "no_ticket"
    }
  },
  "transactions": {
    "payments": [
      {
        "id": "PAY01K22Y503EJ8JHGF64KGY1PZ2B",
        "amount": "69.90",
        "status": "created"
      }
    ]
  }
}
```

O backend salva `id` em `provider_order_id` e o `transactions.payments[0].id` em `provider_payment_id`. Ambos são necessários para consulta e auditoria posterior. [1]

### 4.4 Webhook Point de pagamento confirmado

```http
POST /api/payments/mercado-pago/webhook?data.id=ORD01JYH1Z1YJN4HZ8J3Q0RB3YP6D&type=order HTTP/1.1
Content-Type: application/json
X-Request-Id: 2066ca19-c6f1-498a-be75-1923005edd06
X-Signature: ts=1742505638683,v1=<HMAC_CALCULADO_PELO_MERCADO_PAGO>

{
  "action": "order.processed",
  "api_version": "v1",
  "application_id": "123456",
  "data": {
    "external_reference": "fsa-pos-62c4120b",
    "id": "ORD01JYH1Z1YJN4HZ8J3Q0RB3YP6D",
    "status": "processed",
    "status_detail": "accredited",
    "total_paid_amount": "69.90",
    "transactions": {
      "payments": [
        {
          "amount": "69.90",
          "id": "PAY01K22Y503EJ8JHGF64KGY1PZ2B",
          "paid_amount": "69.90",
          "payment_method": {
            "id": "visa",
            "installments": 1,
            "type": "credit_card"
          },
          "status": "processed",
          "status_detail": "accredited"
        }
      ]
    },
    "type": "point",
    "version": 3
  },
  "date_created": "2026-08-15T15:20:12.000Z",
  "live_mode": false,
  "type": "order",
  "user_id": "123456"
}
```

O `X-Signature` demonstrado é apenas ilustrativo. O handler real deve validá-lo com o segredo cadastrado na aplicação e a implementação oficial de verificação HMAC, além de rejeitar timestamp fora da janela definida pela política de segurança. O exemplo de body, `x-signature` e `x-request-id` segue a estrutura documentada para notificações Point. [2]

### 4.5 Resultado interno normalizado após confirmação

```json
{
  "attemptId": "e7a11bb3-da62-4a73-8502-26c410d8773b",
  "orderId": "62c4120b-7d39-4e69-a899-fb18e28d4df5",
  "providerOrderId": "ORD01JYH1Z1YJN4HZ8J3Q0RB3YP6D",
  "providerPaymentId": "PAY01K22Y503EJ8JHGF64KGY1PZ2B",
  "attemptStatus": "processed",
  "paymentStatus": "aprovado",
  "orderStatus": "pago",
  "inventoryCommitted": true
}
```

## 5. Casos que não podem liquidar um pedido

| Condição | Resultado esperado |
| --- | --- |
| Assinatura inválida ou ausente | HTTP 401; não persistir payload como evento processável. |
| `external_reference` ou `provider_order_id` não corresponde à tentativa | Registrar evento rejeitado e abrir reconciliação; não alterar pedido. |
| Valor do webhook diverge de `amount_cents` | Não aprovar; auditoria e revisão financeira. |
| `order.failed`, `order.canceled` ou `order.expired` | Atualizar tentativa; pedido continua pendente até regra explícita de cancelamento/liberação. |
| Webhook repetido | `ON CONFLICT`/índices tornam a operação inócua; não duplicar `payments` nem baixar estoque novamente. |
| Estoque indisponível na confirmação | A função existente registra bloqueio/cancelamento e exige estorno manual; não ocultar o pagamento recebido. |

## Referências

[1]: https://www.mercadopago.com.br/developers/en/docs/mp-point/payment-processing "Mercado Pago Point — Integrate payment processing"
[2]: https://www.mercadopago.com.ar/developers/en/docs/mp-point/notifications "Mercado Pago Point — Configure orders notifications"
