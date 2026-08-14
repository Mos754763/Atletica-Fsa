# Arquitetura de Atividades de CRM e Integrações de Eventos

**Produto:** ATLETICA FSA  
**Estado:** proposta implementável; integração externa ainda não ativada  
**Atualizado em:** 14 de agosto de 2026

## Objetivo e limites

Este documento transforma o pedido de uma trilha de atividade do CRM em dois conceitos distintos. A **atividade realizada** é um fato imutável sobre uma operação ou tentativa. A **atividade pendente** é uma obrigação explicitamente atribuída, com prazo e estado. O sistema não deve alegar que uma pessoa “não fez” algo que nunca foi atribuído: essa conclusão só é válida para uma expectativa concreta ainda não concluída.

O produto já possui eventos próprios, lotes, reservas transacionais, tickets, QR de uso único, transferência e check-in atômico. A integração externa deve ser uma camada adaptadora, e não substituir esses controles sem um mapeamento formal de propriedade do inventário e da entrada.

## Estado atual da ATLETICA FSA

| Domínio | Contratos existentes | Lacuna que a nova camada resolve |
|---|---|---|
| Eventos | `events`, `event_registrations`, `event_ticket_lots`, `event_tickets`; emissão, pagamento, transferência e check-in em RPCs atômicas. | Não há identificação externa por provedor, importação de dados nem monitoramento da sincronização. |
| Auditoria | `audit_logs` guarda alterações de tabelas customizadas, antes/depois e ator. | É restrita ao construtor de tabelas e não mostra um histórico operacional de CRM por pessoa. |
| Governança | Papéis globais, setores, memberships e permission grants. | Ações de membros, setores, catálogo, eventos, pedidos e automações não produzem uma linha de atividade uniforme. |
| Integrações | Webhook de pagamento endurecido e fila de e-mail. | Falta um modelo governado para credenciais, vínculo de evento externo, cursor de sincronização, deduplicação e falhas. |

## Modelo proposto para a trilha de atividade do CRM

### Eventos realizados e tentativas

A tabela `crm_activity_logs` deve ser **append-only** e armazenar somente dados necessários ao rastreio operacional. O seu contrato proposto é:

| Campo | Finalidade |
|---|---|
| `id`, `occurred_at` | Identidade e ordem temporal do fato. |
| `actor_id`, `actor_kind` | Usuário, integração externa ou sistema que originou a ação. |
| `action`, `outcome` | Verbo canônico, por exemplo `event.created`, `ticket.checked_in`, `member.invited`, e resultado `succeeded`, `blocked`, `failed` ou `ignored`. |
| `resource_type`, `resource_id` | Entidade afetada, sem duplicar seu conteúdo: evento, pedido, ingresso, membro, setor, integração ou tarefa. |
| `sector_id`, `request_id`, `source` | Contexto organizacional, correlação técnica e origem `web`, `api`, `cron`, `external_sync` ou `system`. |
| `summary`, `metadata_json` | Resumo legível e metadados em lista permitida. Não deve conter token, senha, documento, payload bruto de pagamento ou QR. |

As ações de interface registram operações aceitas e recusadas com contexto de permissão. As mudanças de dados críticas também recebem gatilhos no banco para garantir cobertura quando a origem é uma RPC, webhook ou console operacional. O payload de diffs deve ser mínimo e mascarar campos pessoais, financeiros e de autenticação.

### Obrigações não concluídas

A tabela `crm_activity_expectations` representa uma ação esperada: responsável, título, ação esperada, recurso relacionado, prazo, prioridade, criador, conclusão e cancelamento. A interface calcula **pendente** ou **em atraso** com base em `due_at`, sem criar afirmações especulativas sobre comportamento.

| Situação | Critério |
|---|---|
| Concluída | `completed_at` e `completed_by` presentes. |
| Em aberto | Não concluída, sem cancelamento e prazo ainda não vencido. |
| Em atraso | Não concluída, sem cancelamento e `due_at < now()`. |
| Cancelada | `cancelled_at` presente, com razão registrada. |

Uma atividade real pode finalizar uma obrigação por `expectation_id`. A tela permite que presidente e administradores consultem a linha do tempo, filtrem por ator, resultado, setor, recurso e intervalo, e criem ou encerrem obrigações. Diretores recebem apenas o recorte autorizado de seu setor.

## Cobertura mínima de atividades

| Área | Ações a registrar |
|---|---|
| Acesso e autorização | login realizado, logout, acesso bloqueado, papel incompatível, sessão expirada. |
| CRM e membros | convite emitido, convite aceito, perfil alterado, papel alterado, setor atribuído/removido, permissão concedida/revogada. |
| Eventos | evento criado/alterado, status alterado, lote criado/publicado, inscrição emitida, ingresso transferido, check-in aceito/duplicado/bloqueado. |
| Comércio | produto e mídia alterados, pedido criado, pagamento liquidado/recusado, retirada confirmada, estoque reservado/baixado. |
| Automação e integração | e-mail enfileirado/enviado/falhou, sincronização iniciada/concluída/falhou, item importado/ignorado/conflitado. |

## Integrações externas de eventos: viabilidade

| Opção | Valor para a ATLETICA FSA | Limite principal | Decisão recomendada |
|---|---|---|---|
| **Eventos e operação nativos** | Mantém checkout Mercado Pago, lotes, QR e ODS sob controle do produto. | Exige condução própria das vendas e divulgação. | Padrão para eventos da Atlética em que operação e dados devem permanecer internos. |
| **Sympla como operação externa** | A API pública para produtores expõe eventos, pedidos, participantes e check-in. Autentica por `s_token` no servidor. [1] | O checkout da Sympla permanece na jornada dela; a API pública deve ser tratada como sincronização operacional, não substituto automático do checkout interno. | Melhor primeira integração externa, após confirmação de token de produtor e política de sincronização. |
| **Fever Reporting API** | Dados de vendas, pedidos e informações básicas de clientes podem alimentar CRM/BI/ERP. [2] | A API pública é de relatórios, requer aprovação de parceiro e não serve para controle de acesso ou inventário em tempo real. [2] | Alternativa analítica B2B, não indicada para check-in ou estoque operacional da ATLETICA FSA. |

> A documentação da Fever é explícita: a Reporting API “is not designed for real-time operational use cases like access control or live inventory tracking.” [2]

### Contrato técnico por provedor

| Item | Sympla | Fever Reporting |
|---|---|---|
| Autenticação | Cabeçalho privado `s_token`; segredo somente no backend. [1] | Credenciais de parceiro obtêm Bearer token; acesso requer aprovação comercial. [2] |
| Leitura operacional | Eventos, pedidos, participantes e apresentações. [1] | Relatórios de order items, sessões, planos, vendas e revendedores. [2] |
| Check-in | Há rotas canônicas por participante, ticket number e QR. [1] | Não é o uso da API de Reporting. [2] |
| Sincronização | Polling incremental, paginação e deduplicação por identificador externo; confirmar limites na credencial real. | Pesquisa assíncrona `POST /search`, leitura por `search_id` e páginas; `202` significa processamento. [2] |
| Resiliência | Timeout, backoff com jitter em `429`/`5xx`, cursor e fila de falhas. | Até 20 requisições/minuto para autenticação e 200/minuto para demais endpoints; `429` requer espera antes de retomar. [2] |

## Arquitetura de integração proposta

Cada provedor deve passar por um adaptador de backend. Nenhum token, chamada externa ou payload de parceiro pode ir ao navegador.

```text
Painel administrativo
       │
       ├── Evento nativo ──────► RPCs transacionais ──────► eventos / tickets / pagamentos
       │
       └── Evento externo ────► API interna de integração ─► adaptador Sympla ou Fever
                                                           │
                                                           ├── event_external_links
                                                           ├── external_event_records
                                                           ├── event_sync_runs / dead-letter
                                                           └── crm_activity_logs
```

### Migrações necessárias antes de ativar um provedor

| Estrutura | Campos principais | Restrição de segurança |
|---|---|---|
| `event_integrations` | `provider`, `status`, `display_name`, `config_public_json`, `created_by`. | Configuração sem credenciais; apenas administração global pode gerenciar. |
| `event_external_links` | `integration_id`, `event_id`, `external_event_id`, `sync_mode`, `last_synced_at`, `cursor_json`. | Único por integração e ID externo; define qual lado é mestre. |
| `external_event_records` | vínculo, `external_type`, `external_id`, `checksum`, `normalized_json`, `observed_at`. | Único por vínculo/tipo/ID; payload sanitizado, sem segredo. |
| `event_sync_runs` | vínculo, `status`, `started_at`, `finished_at`, contagens, cursor e erro mascarado. | Apenas equipe autorizada lê; toda execução gera atividade. |
| `integration_dead_letters` | execução, chave de deduplicação, tentativa, próximo retry e erro sanitizado. | Reprocessamento manual auditado; sem descarte silencioso. |

### Rotas e serviços planejados

| Camada | Rota ou serviço | Responsabilidade |
|---|---|---|
| Administração | `/admin/atividades` | Timeline, filtros, obrigações, exportação governada. |
| Administração | `/admin/integracoes/eventos` | Cadastro de vínculo, status, última execução, conflito e reprocessamento. |
| API interna | `POST /api/integrations/events/{provider}/sync` | Aciona sincronização autenticada, idempotente e com rate limit. |
| API interna | `POST /api/scheduled/event-sync` | Executa sincronização recorrente autorizada e idempotente quando houver conector ativo. |
| Serviço | `src/lib/integrations/events/{provider}.ts` | Traduz a API de cada provedor para um contrato interno normalizado. |
| Serviço | `src/lib/crm/activity.ts` | Publica fatos de atividade com máscara e tipagem. |

## Fluxos operacionais

### Fluxo de atividade e obrigação

1. Uma ação do usuário passa por autorização no servidor.
2. A operação registra um evento de atividade com ator, recurso e resultado. Uma recusa registra apenas o motivo canônico e o contexto mínimo.
3. Se a ação conclui uma obrigação, a mesma transação atualiza `completed_at` e cria a atividade correspondente.
4. O painel calcula obrigações vencidas em tempo real e oferece filtros e links ao recurso original.

### Fluxo Sympla

1. Um administrador vincula um evento interno ao `eventIdHash` externo.
2. O backend injeta `s_token` a partir do cofre de variáveis e lista pedidos/participantes com cursor.
3. Cada registro é normalizado e deduplicado por `provider + external_id`; divergências não sobrescrevem dados internos automaticamente.
4. Uma política explícita define o dono do check-in. Se Sympla for o dono, o check-in local consulta/espelha o resultado; se a ATLETICA FSA for o dono, a sincronização é posterior. Nunca os dois em escrita concorrente sem uma chave de idempotência.

### Fluxo Fever

1. A ATLETICA FSA obtém aprovação de parceiro e credenciais da Fever.
2. O adaptador obtém Bearer token somente no backend e cria uma pesquisa assíncrona por período/cursor.
3. Enquanto a resposta for `202`, o trabalho persiste o `search_id` e volta de maneira limitada; quando pronto, consome as partições paginadas.
4. Itens normalizados alimentam CRM/BI e atividades; não alteram estoque ou check-in em tempo real.

## Segurança, LGPD e operação

| Risco | Controle |
|---|---|
| Exposição de credenciais | Segredos em variáveis de ambiente; UI nunca lê tokens; rotação e mínimo privilégio. |
| Duplicação e reprocessamento | Chaves únicas por provedor/registro, cursor persistente, checksum e execução idempotente. |
| Conflito de inventário | Escolher um único sistema mestre por lote/check-in; nunca baixar estoque nativo a partir de importação analítica. |
| Dados excessivos | Normalizar somente campos necessários, mascarar logs, reter payload bruto por prazo limitado e documentar finalidade. |
| Falhas transitórias | Timeout, backoff exponencial com jitter, respeito a `429`, dead-letter e reprocessamento auditado. |
| Ação não autorizada | RLS, checagem de papel/setor, registro de bloqueio e revisão por administração. |

## Pré-requisitos para ativação

1. Escolher se o primeiro conector será **Sympla operacional** ou **Fever analítico**.
2. Definir por evento o sistema mestre de venda, inventário, ticket e check-in.
3. Fornecer credenciais por variável de ambiente, nunca em formulário ou repositório.
4. Homologar com um evento de teste e executar reconciliação de contagens antes da primeira produção.
5. Publicar o aplicativo antes de habilitar qualquer rotina recorrente de sincronização.

## Referências

[1]: https://developers.sympla.com.br/api-doc/ "Sympla Public API Docs"
[2]: https://data-reporting-api.prod.feverup.com/v1/redoc "Fever Reporting API"
