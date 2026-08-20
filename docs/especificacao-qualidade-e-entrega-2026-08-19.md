# Especificação de qualidade, testes e entrega segura — ATLETICA FSA

**Versão:** 1.0  
**Data:** 19 de agosto de 2026  
**Autor:** Manus AI  
**Base de evidência:** auditoria integral da plataforma, repositório versionado, Supabase, Vercel, GitHub Actions e homologação.

## 1. Objetivo e regra de conclusão

Este documento transforma a auditoria em requisitos executáveis. Ele define o que falta, como provar a correção, quais cenários extremos precisam ser cobertos, como estruturar issues, branches e pull requests, e quais gates devem impedir uma promoção insegura.

> Uma funcionalidade somente pode ser marcada como **concluída** quando o código, a migration se aplicável, os testes automatizados, o ensaio de homologação, a evidência de CI e a documentação de operação estiverem alinhados. Interface pronta sem segurança, persistência ou teste não constitui conclusão.

Os pagamentos, a liquidação de ingressos pagos e automações que dependam de funções privilegiadas permanecem bloqueados enquanto os itens P0 não forem aprovados e validados em homologação. O valor de `PAYMENTS_ENABLED` em produção não deve ser alterado durante este plano.

| Gate obrigatório | Critério mínimo | Evidência aceitável |
|---|---|---|
| Tipagem | `pnpm typecheck` sem erro | Log de CI da revisão candidata |
| Testes | `pnpm test` verde, sem novos skips | Sumário de testes e IDs de cenários cobertos |
| Build | `pnpm build` concluído com variáveis mínimas | Log de build da revisão candidata |
| Dados | Migration aplicada em homologação e RLS/grants conferidos | SQL de verificação somente leitura e teste de negação |
| Segurança | Sem segredo no diff, sem privilégio público indevido, sem bypass de papel | Revisão de PR e testes de autorização |
| Operação | Dashboard/alerta e caminho de rollback documentados | Checklist de release preenchido |
| Produção | Aprovação explícita da Presidência quando houver banco, credenciais, pagamento ou dados | Registro da aprovação e janela de mudança |

## 2. Requisitos pendentes e ações corretivas

### 2.1 Bloqueadores P0

| ID | Requisito de correção | Definição de pronto | Testes obrigatórios |
|---|---|---|---|
| SEC-DB-01 | `claim_email_outbox(p_limit integer)` deve perder `EXECUTE` de `PUBLIC`, `anon` e `authenticated`; somente worker interno/service role poderá chamá-la. | A função continua acessível ao worker autorizado, mas uma chamada de usuário não privilegiado recebe negação antes de retornar qualquer linha. | `DB-AUTH-01` a `DB-AUTH-04`, `EMAIL-OUTBOX-01` a `EMAIL-OUTBOX-05` |
| SEC-DB-02 | `settle_paid_event_ticket(...)` deve ficar acessível somente ao caminho de webhook/serviço privilegiado. | Não existe liquidação manual por RPC pública; pagamento confirmado só muda o ingresso após assinatura, consulta ao provedor e transição válida. | `PAY-WEBHOOK-01` a `PAY-WEBHOOK-10`, `EVENT-PAID-01` a `EVENT-PAID-05` |
| SEC-DB-03 | `expire_stale_email_outbox()` deve perder execução pública. | Somente cron/worker autorizado pode expirar jobs; chamada pública falha sem alterar estado. | `DB-AUTH-05`, `EMAIL-OUTBOX-06`, `CRON-EMAIL-01` |
| PAY-GATE-01 | O bloqueio financeiro precisa permanecer verificável em todos os ambientes até a homologação final. | Checkout de pagamento retorna resposta controlada sem criar preferência externa; POS não cria ordem real; produção mantém pagamentos desativados. | `PAY-GATE-01` a `PAY-GATE-05`, inspeção manual Vercel por nome/ambiente |

### 2.2 Correções P1 e P2

| ID | Requisito | Condição de aceite | Casos de teste relacionados |
|---|---|---|---|
| INT-HEALTH-01 | O health check não pode se declarar crítico por não enxergar a própria execução corrente. | Após dois heartbeats saudáveis consecutivos, o estado agregado fica `healthy`; falha real volta a degradar o estado. | `CRON-HEALTH-01` a `CRON-HEALTH-06` |
| INT-SYM-01 | As duas dead letters Sympla devem receber causa, decisão e reprocessamento/encerramento auditável. | Cada item aberto contém status terminal ou tentativa idempotente registrada; health separa incidente atual de backlog histórico. | `SYMPLA-01` a `SYMPLA-09` |
| INT-EMAIL-01 | Deve haver ensaio controlado de e-mail transacional em homologação. | Outbox, entrega, identificador do provedor e falha simulada são observáveis sem persistir conteúdo sensível em logs. | `EMAIL-OUTBOX-01` a `EMAIL-OUTBOX-10` |
| EXPORT-01 | CSV e XLSX devem neutralizar valores textuais iniciados por `=`, `+`, `-` ou `@`. | O arquivo abre sem executar fórmula e preserva o valor visual do campo. | `EXPORT-01` a `EXPORT-08` |
| MIGRATION-01 | O projeto deve ter ledger de migrations/checksums e tratar `public.table_name` por migration aprovada. | É possível provar quais migrations foram aplicadas e detectar drift; remoção do artefato exige backup e janela aprovada. | `MIGRATION-01` a `MIGRATION-07` |
| DEPLOY-01 | Preview e produção devem usar variáveis e serviços segregados. | Preview aponta somente para Supabase e credenciais sandbox; Production usa produção e mantém o gate financeiro desligado. | `ENV-01` a `ENV-08`, validação manual por nomes no painel Vercel |
| GOVERN-01 | A entrega deve ter processo formal de PR, checklist e política de segurança. | `SECURITY.md`, template de PR, template de issue e regra manual de promoção estão versionados e em uso. | `CICD-01` a `CICD-08` |
| PERF-01 | Landing e loja devem ter medição real de TTFB, LCP, CLS e INP. | Há baseline por dispositivo e uma regressão acima do limiar abre issue; não se otimiza apenas pelo tempo do `curl`. | `PERF-01` a `PERF-05` |

## 3. Arquitetura de testes exigida

Os testes devem ser organizados por responsabilidade, usar dados efêmeros e nunca usar produção como ambiente de escrita. Suites que tocam banco devem exigir uma URL identificada como homologação/teste e abortar quando detectarem identificador de produção.

| Camada | Escopo | Ferramenta/padrão | Proibido |
|---|---|---|---|
| Unitário | Funções puras, state machines, validação, serialização, normalização e permissões | Vitest, sem rede, sem banco | Dependência de relógio real, `Math.random()` sem injeção, segredo em fixture |
| Contrato | Handlers e Server Actions com dependências simuladas | Vitest + mocks estritos de Supabase/MP/Resend/Sympla | Mock permissivo que aceite payload inválido |
| Integração de banco | RPC, RLS, grants, concorrência e migrations em homologação isolada | `pg`/Supabase com transação e limpeza controlada | Executar contra produção, `TRUNCATE` amplo ou apagar dados reais |
| E2E | Jornada pública, login, catálogo, pedido, evento, ERP e ODS | Navegador em preview/homologação | Pagamento real, e-mail a terceiros ou alteração de estoque produtivo |
| Segurança | Auth, RBAC, RLS, assinaturas, replay, rate limit, CSV injection | Testes negativos explícitos | Considerar somente o caminho de sucesso |
| Operacional | Cron, health, outbox, dead letter, alertas e rollback | Sandbox, jobs controlados e logs sanitizados | Disparo de lote produtivo sem autorização |
| Performance e acessibilidade | Web Vitals, teclado, foco, contraste, mobile e tema | Lighthouse/Speed Insights + teste manual | Substituir medição real por impressão visual |

Cada teste deve ter identificador estável no nome, preparar e limpar seus próprios dados, declarar precondições e verificar tanto o estado final como os efeitos colaterais permitidos. Um teste de mutação deve comprovar que não alterou preço, estoque, papel ou pedido fora da sua fixture.

## 4. Matriz de testes funcionais, negativos e edge cases

### 4.1 Identidade, sessão, MFA e RBAC

| ID | Cenário | Resultado esperado |
|---|---|---|
| AUTH-01 | Visitante acessa `/conta`, `/erp`, `/ods`, `/admin` e `/conta/seguranca`. | Redirecionamento para login com destino interno seguro; nenhuma resposta contém dados privados. |
| AUTH-02 | Login por e-mail/senha válida sem MFA inscrito. | Sessão criada e retorno ao destino permitido. |
| AUTH-03 | Login com senha incorreta, e-mail inexistente e payload malformado. | Erro genérico sem enumeração de usuário, sem sessão e sem loop de loading. |
| AUTH-04 | Link de recuperação expirado, repetido, adulterado e com destino externo. | Erro controlado; nenhum redirect aberto; senha anterior permanece válida até troca concluída. |
| AUTH-05 | Callback OAuth recebe `next` absoluto, `javascript:`, URL com host malicioso e caminho relativo válido. | Apenas caminho interno permitido é aceito. |
| MFA-01 | Usuário inscreve TOTP, confirma QR e passa a AAL2. | Fator verificado, sessão elevada e segredo não registrado em log. |
| MFA-02 | Código TOTP inválido, expirado, com letras, oito dígitos ou repetido. | Verificação negada sem remover fator nem elevar sessão. |
| MFA-03 | Usuário com fator inscrito faz login novamente. | Desafio é exigido antes do destino protegido; destino original é preservado. |
| MFA-04 | Usuário tenta remover o último fator, fator inexistente ou fator de outro usuário. | Ação só permite fatores próprios e exige confirmação/garantia adequada; não há remoção cruzada. |
| RBAC-01 | `cliente`, `caixa`, `backoffice/cozinha`, `admin` e Presidência percorrem menu e rotas. | Interface e servidor aplicam a matriz de menor privilégio; acesso negado é registrado sem vazar recurso. |
| RBAC-02 | Cliente altera payload de role, `is_president`, setor ou `profile_id`. | Servidor e RLS ignoram/negam autoelevação e atualização de perfil alheio. |
| RBAC-03 | Administração remove/demove o último administrador. | Operação é bloqueada antes de persistir. |

### 4.2 Banco, RLS, RPCs, migrations e concorrência

| ID | Cenário | Resultado esperado |
|---|---|---|
| DB-AUTH-01 | `anon` tenta executar `claim_email_outbox`. | PostgreSQL nega `EXECUTE`; zero linhas e zero mudança de estado. |
| DB-AUTH-02 | `authenticated` não administrativo tenta executar `claim_email_outbox`. | Mesma negação, inclusive após enviar parâmetros extremos. |
| DB-AUTH-03 | Worker com service role chama a outbox com limite 1, 0, negativo, máximo e nulo. | Somente limites validados; reivindicação atômica e sem duplicidade. |
| DB-AUTH-04 | Duas execuções simultâneas do worker competem pela mesma mensagem. | Uma única transação reivindica a mensagem; não ocorre entrega duplicada. |
| DB-AUTH-05 | `anon` tenta chamar funções de expiração, manutenção, trigger e liquidação. | Todas as funções internas são negadas por grant, mesmo se tiverem `SECURITY DEFINER`. |
| RLS-01 | Visitante consulta tabelas públicas e privadas diretamente. | Catálogo/eventos públicos só retornam campos destinados ao público; tabelas privadas são negadas. |
| RLS-02 | Cliente A consulta/atualiza pedido, ingresso, token QR, interesse ou atividade do cliente B. | Leitura e escrita negadas; resposta não informa existência do UUID. |
| RLS-03 | Caixa tenta operação exclusiva de Presidência; Backoffice tenta relatório administrativo. | Negação no servidor e no banco. |
| RLS-04 | Service role é usado somente em rota/ação já autenticada. | Teste de código garante que nenhum módulo cliente importa a chave de serviço. |
| MIGRATION-01 | Migration nova registra ID, checksum, timestamp e ambiente. | Execução repetida é idempotente ou falha com diagnóstico seguro; checksum divergente bloqueia promoção. |
| MIGRATION-02 | Migração possui `DROP`, mudança de tipo, grant ou policy. | PR exige plano de rollback, backup e teste em homologação. |
| MIGRATION-03 | `public.table_name` é removida. | Backup de schema produzido, dependências checadas, migration reversível/arquivada e homologação verde antes de produção. |
| DATA-01 | Transições concorrentes de pedido, ticket, check-in e retirada QR. | Uma única transição vence; segunda retorna conflito idempotente, nunca duplicidade. |

### 4.3 Catálogo, estoque, carrinho, checkout e Mercado Pago

| ID | Cenário | Resultado esperado |
|---|---|---|
| CATALOG-01 | Admin cria, edita, arquiva e exclui produto, imagem, categoria e variação. | Loja, landing e ERP refletem estado correto sem produto órfão, imagem quebrada ou estoque incoerente. |
| CATALOG-02 | Dados inválidos: preço negativo, estoque não inteiro, SKU duplicado, imagem MIME inválido, slug duplicado. | Validação no servidor e banco; erro utilizável; nenhuma escrita parcial. |
| STOCK-01 | Duas compras concorrentes disputam a última unidade. | Uma reserva vence; outra recebe indisponibilidade; estoque não fica negativo. |
| STOCK-02 | Checkout externo falha depois da reserva. | Pedido pendente é compensado/cancelado e reserva devolvida uma única vez. |
| CART-01 | Cliente envia total, preço, desconto, título ou `product_id` adulterado. | Servidor ignora valores de cliente e calcula a partir do banco. |
| PAY-GATE-01 | `PAYMENTS_ENABLED=false` em preview e produção. | Criação de preferência e ordem POS não chamam fornecedor e devolvem erro controlado. |
| PAY-WEBHOOK-01 | Webhook sem assinatura, com assinatura inválida, timestamp vencido e corpo modificado. | Rejeição 401/403; nenhum pedido, estoque ou ticket é alterado. |
| PAY-WEBHOOK-02 | Assinatura válida com `payment_id` desconhecido ou referência externa divergente. | Evento registrado como falha segura; sem liquidação. |
| PAY-WEBHOOK-03 | Mesmo webhook é entregue duas, três ou dez vezes. | Uma única conciliação e um único histórico/e-mail por transição válida. |
| PAY-WEBHOOK-04 | Provedor responde timeout, 429, 5xx ou payload parcial durante consulta de pagamento. | Nenhuma confirmação otimista; retry seguro ou dead letter; estado interno preservado. |
| PAY-WEBHOOK-05 | Pagamento aprovado possui valor, moeda, parcelas ou recebedor divergente. | Reconciliação negada e alerta de segurança/operacional criado. |
| POS-01 | Ordem Point com terminal ausente, ID repetido, status fora de ordem e webhook duplicado. | Validação prévia, idempotência e conciliação somente por estado autorizado do provedor. |

### 4.4 Eventos, ingressos, QR, check-in e Sympla

| ID | Cenário | Resultado esperado |
|---|---|---|
| EVENT-01 | Inscrição gratuita com capacidade disponível. | Uma inscrição única, QR opaco e trilha de atividade são gerados. |
| EVENT-02 | Mesmo usuário tenta duas inscrições, inclusive em requisições paralelas. | Restrição/RPC atômica preserva uma única inscrição. |
| EVENT-03 | Evento lotado, lote expirado, evento encerrado ou lote sem preço válido. | Inscrição recusada com mensagem de domínio; não gera QR nem outbox indevida. |
| EVENT-PAID-01 | Fluxo de ingresso pago antes da correção de SEC-DB-02. | Nenhuma liquidação é permitida; testes comprovam bloqueio e gate. |
| EVENT-PAID-02 | Após correção P0, webhook autorizado confirma ingresso pago. | Valor, referência, estado e idempotência são validados antes de marcar pago. |
| QR-01 | QR válido é apresentado para retirada/check-in. | Consumo atômico uma única vez; histórico registra ator, horário e contexto. |
| QR-02 | QR usado, expirado, adulterado, pertencente a outro pedido ou submetido em paralelo. | Resposta segura e idempotente; nenhuma segunda retirada/check-in. |
| CHECKIN-01 | Dois operadores fazem check-in simultâneo. | Um confirma; outro recebe conflito/estado já processado. |
| SYMPLA-01 | Sincronização traz novo evento, atualização, duplicidade e cancelamento. | Upsert usa chave externa, preserva origem e não duplica evento/inscrição. |
| SYMPLA-02 | API retorna 401, 403, 429, timeout e 5xx. | Falha classificada, dead letter idempotente, alerta deduplicado e cron não entra em loop. |
| SYMPLA-03 | Dead letter é reprocessada duas vezes ou após resolução. | Apenas uma operação efetiva; estado terminal e motivo são auditáveis. |

### 4.5 ODS, ERP, CRM, construtor de tabelas e exportação

| ID | Cenário | Resultado esperado |
|---|---|---|
| ODS-01 | Backoffice vê fila permitida e realiza transições válidas. | Estado segue máquina de transição; cliente não acessa operação ODS. |
| ODS-02 | Operador tenta pular estado, atualizar pedido desatualizado ou alterar pedido de outro setor. | Operação negada/conflito; nenhum overwrite silencioso. |
| ODS-03 | Pedido manual contém produto inexistente, quantidade zero, desconto inválido ou cliente opcional. | Validação de domínio, preço em centavos e histórico consistente. |
| ERP-01 | Administração cria membro, convite, setor e permissionamento granular. | Papel inicial restrito; convite não autoeleva; o último admin é preservado. |
| TABLE-01 | Usuário cria tabela com slug inválido, duplicado, reservado, longo ou caracteres Unicode. | Erro específico antes de persistir; regressão histórica de slug coberta no CI. |
| TABLE-02 | Tabela recebe coluna/tipo inválido, dado acima do limite, edição concorrente e exclusão com registros. | Limites documentados, transação consistente e bloqueio/arquivamento seguro. |
| CRM-01 | Ação operacional cria atividade. | Ator, recurso, tipo, tempo e metadado mínimo são registrados sem segredo ou conteúdo desnecessário. |
| EXPORT-01 | Exportação contém fórmula, quebra de linha, aspas, UTF-8, célula longa e valor nulo. | CSV/XLSX/PDF preservam dados de forma segura e não executável. |
| EXPORT-02 | Usuário autorizado exporta dataset permitido; usuário não autorizado tenta todos os formatos. | Administração recebe arquivo correto e auditado; não autorizado recebe 403 sem metadados. |

### 4.6 E-mail, automações, cron, alertas e observabilidade

| ID | Cenário | Resultado esperado |
|---|---|---|
| EMAIL-OUTBOX-01 | Evento cria mensagem de e-mail. | Chave de idempotência por evento/destinatário evita duplicação. |
| EMAIL-OUTBOX-02 | Worker autorizado processa mensagem com sucesso. | Outbox e delivery refletem a transição; e-mail não é reenviado em retry. |
| EMAIL-OUTBOX-03 | Resend retorna 4xx, 5xx, timeout e resposta malformada. | Falha classificada; retry com limite/backoff; pagamento e inscrição não são revertidos. |
| EMAIL-OUTBOX-04 | Dois workers chamam outbox simultaneamente. | Lock impede dupla reivindicação/entrega. |
| EMAIL-OUTBOX-05 | Conteúdo contém HTML, link, caracteres especiais e dados pessoais. | Template escapa conteúdo indevido, não loga corpo completo e respeita LGPD. |
| CRON-HEALTH-01 | Cron sem `Authorization`, token errado, token vazio e token com prefixo inválido. | 401/403 sem executar trabalho. |
| CRON-HEALTH-02 | Health coleta o próprio heartbeat. | Usa heartbeat anterior/início da execução e não produz falso crítico. |
| CRON-HEALTH-03 | Integração recupera após falha. | Alerta de recuperação é emitido uma vez e estado fica saudável. |
| CRON-HEALTH-04 | Alerta de falha repetido na janela de deduplicação. | Uma notificação, contador/ocorrência atualizado e sem spam Slack. |
| CRON-HEALTH-05 | Job excede janela ou falha com exceção. | Timeout controlado, heartbeat de erro, correlação e dead letter quando aplicável. |
| OBS-01 | Erro de runtime conhecido reaparece: env Supabase ausente, slug inválido, `use server`, interest table, `registration_id`. | CI/contrato detecta a regressão antes do deploy. |

### 4.7 Interface, acessibilidade, compatibilidade e performance

| ID | Cenário | Resultado esperado |
|---|---|---|
| UI-01 | Landing, loja, login, conta, ERP, ODS e eventos em 320px, 768px e desktop. | Sem overflow horizontal, botão inacessível ou conteúdo encoberto pela sidebar. |
| UI-02 | Tema claro/escuro nos módulos de loja, ODS, ERP e segurança. | Contraste AA, estados de foco visíveis e sem texto invisível. |
| UI-03 | Teclado percorre navegação, modal, formulário, drawer e logout. | Ordem de foco lógica, Escape fecha camadas, foco retorna ao gatilho. |
| UI-04 | `prefers-reduced-motion` ativo. | Partículas, parallax e animações não essenciais são reduzidos sem quebrar conteúdo. |
| UI-05 | Rede lenta, imagem ausente e resposta de API lenta. | Skeleton/erro/retentativa sem congelar a interface nem alterar estado incorretamente. |
| PERF-01 | LCP, INP e CLS de landing e loja em mobile/desktop. | Baseline documentado; regressão acima de limiar abre issue de performance. |

## 5. Requisitos de ambientes, segredos e dados de teste

O contrato de ambiente deve ser validado por **nome e escopo**, nunca por impressão de valores em logs, commits, issues ou capturas. Preview/homologação deve apontar exclusivamente para `gfnbdjdqumewspvfxicl` e chaves de sandbox; produção deve apontar somente para `tbxihkzuyzszrfxqmleq`. `PAYMENTS_ENABLED=false` deve permanecer nos dois contextos enquanto os P0 e o roteiro sandbox não forem concluídos.

| Controle | Requisito |
|---|---|
| Banco de testes | Guardar identificador permitido em helper `resetTestDatabase()` e abortar conexões com host/projeto de produção. |
| Dados efêmeros | Prefixar e-mail, pedido, evento e referências de teste; apagar somente a fixture criada pela suite. |
| Segredos | Usar secrets do GitHub/Vercel/Supabase; nunca `.env` versionado ou output de terminal anexado a PR. |
| Webhooks | Assinaturas e payloads sandbox ficam em variáveis protegidas; replay é exercitado somente em homologação. |
| E-mails | Destinatário externo só com autorização e endereço de teste; nenhum disparo para membros reais em suite automática. |
| Pagamentos | Sempre sandbox até aprovação explícita; nenhum cartão, credencial ou ordem POS real em CI. |

## 6. Estratégia de branches, commits, pull requests e releases

O repositório mantém `main` como referência de produção. Como a proteção técnica de branch não está disponível no plano atual, a proteção deve ser operacional e evidenciada em cada promoção.

| Elemento | Padrão obrigatório |
|---|---|
| Branch de feature | `feat/<dominio>-<resumo-curto>`; exemplo: `feat/security-revoke-outbox-rpc` |
| Branch de correção | `fix/<dominio>-<resumo-curto>`; exemplo: `fix/sympla-health-self-check` |
| Branch de segurança | `security/<id>-<resumo-curto>`; exemplo: `security/db-01-outbox-grant` |
| Branch de documentação | `docs/<resumo-curto>` |
| Branch de release | `release/YYYY-MM-DD-<tema>` apenas quando houver conjunto de migrations/configuração sensível |
| Commits | Conventional Commits: `feat`, `fix`, `security`, `test`, `docs`, `ci`, `refactor`, `chore`; assunto curto e imperativo |
| Uma PR | Um objetivo de domínio; migrations, testes e documentação relacionados podem coexistir; não misturar UI ampla e mudanças P0 de banco |
| Nome de PR | `[P0|P1|P2|P3] <domínio>: <resultado verificável>` |
| Merge | Preferir squash para feature/correção; nunca promover sem CI verde documentado e revisão humana registrada |

### Checklist obrigatório de pull request

```markdown
## Objetivo e risco
- [ ] Issue vinculada e prioridade declarada
- [ ] Nenhum preço, estoque ou dado de produção foi alterado fora da migração aprovada
- [ ] `PAYMENTS_ENABLED` não foi habilitado

## Dados e segurança
- [ ] RLS, grants e `SECURITY DEFINER` revisados quando houver banco
- [ ] Nenhum segredo, token, URL privada ou dado pessoal foi incluído
- [ ] Há plano de rollback para migration/configuração sensível

## Qualidade
- [ ] Testes unitários/contrato adicionados ou atualizados
- [ ] Casos negativos e concorrência foram cobertos quando aplicável
- [ ] `pnpm typecheck`, `pnpm test` e `pnpm build` estão verdes
- [ ] Preview/homologação validado quando houver fluxo de interface ou integração

## Operação
- [ ] Dashboard, log, alerta e runbook atualizados quando houver cron/webhook/outbox
- [ ] Variáveis foram conferidas por nome e ambiente; valores não foram expostos
- [ ] Critérios de aceite e rollback foram anexados à PR
```

### Estados de issue

| Estado | Significado | Saída necessária |
|---|---|---|
| `triage` | Achado ainda sem reprodução suficiente | Evidência mínima, severidade e dono proposto |
| `ready` | Requisito, risco e aceite definidos | Branch sugerida e plano de teste |
| `in-progress` | Código/migration em desenvolvimento | Checkpoint de testes locais |
| `in-review` | PR aberta | Checklist completo e CI em andamento |
| `blocked-external` | Depende de credencial, fornecedor ou aprovação | Responsável externo, dado faltante e prazo de reavaliação |
| `validated-homolog` | Homologação aprovada | Evidência de execução e rollback conferido |
| `released` | Produção aprovada e monitorada | Commit/deploy, métricas iniciais e janela de observação |

## 7. CI/CD mínimo e gates de promoção

O workflow atual deve continuar usando instalação imutável e executar tipagem, testes e build. Ele deve ser estendido para validar também branches que alimentam homologação, mantendo `main` como único gatilho de produção automática.

| Gate | Push em branch | Pull request para `main` | Release para produção |
|---|---|---|---|
| Instalação imutável | Obrigatório | Obrigatório | Obrigatório |
| Tipo, testes e build | Obrigatório | Obrigatório | Obrigatório |
| Auditoria de dependências produção | Obrigatório | Obrigatório | Obrigatório |
| Diff de migration/grants/RLS | Quando `supabase/migrations/**` mudar | Obrigatório se houver SQL | Aprovação explícita + backup/rollback |
| Testes de integração sandbox | Quando checkout, webhook, cron, e-mail ou Sympla mudar | Obrigatório antes de merge | Evidência de homologação anexada |
| Preview Vercel | Recomendado | Obrigatório para UI/rotas | Não substitui homologação |
| Aprovação humana | Recomendado | Obrigatória operacionalmente | Presidência para P0, dados, pagamentos e variáveis |

O CI não deve executar migrations contra produção, criar pagamentos, enviar e-mails externos ou chamar webhooks reais. Integrações devem ser substituídas por sandbox ou mocks contratuais, e o job deve falhar se uma variável de produção for detectada em ambiente de teste.

## 8. Ordem de implementação recomendada

1. Abrir `security/db-01-outbox-grant` e corrigir SEC-DB-01/03 com migration, testes de grant e ensaio de worker em homologação.
2. Abrir `security/db-02-ticket-settlement` e corrigir SEC-DB-02 com teste negativo de RPC e teste sandbox de webhook.
3. Abrir `fix/sympla-health-self-check` para INT-HEALTH-01/INT-SYM-01, com fixture de dead letter e alerta de recuperação.
4. Abrir `test/email-outbox-homologation` para ensaio controlado e testes de idempotência/retry da outbox.
5. Abrir `fix/export-formula-neutralization` para EXPORT-01, incluindo vetores CSV/XLSX e auditoria de exportação.
6. Abrir `chore/migration-ledger-and-table-name` para governança de migrations e plano aprovado do artefato ocioso.
7. Abrir `ci/quality-gates-and-security-policy` para templates, `SECURITY.md`, gatilhos CI e checklist de release.
8. Somente após os itens anteriores, executar homologação financeira completa, revisar variáveis no painel e solicitar aprovação de produção.

## Referências

[1]: ./auditoria-integral-plataforma-2026-08-19.md "Auditoria integral da plataforma ATLETICA FSA"  
[2]: ./validacao-auth-homologacao-2026-08-19.md "Validação de autenticação em homologação"  
[3]: ../src/lib/env.ts "Contrato de variáveis de ambiente"  
[4]: ../vercel.json "Configuração de cron versionada"  
[5]: ../.github/workflows/ci.yml "Continuous Integration"
