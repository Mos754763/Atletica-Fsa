# Relatório detalhado de pendências remanescentes — ATLETICA FSA

**Data de referência:** 20 de agosto de 2026  
**Escopo:** pendências ainda abertas no checklist mestre; situação de código, QA, CI/CD, homologação e produção.  
**Base da análise:** checklist do repositório, relatórios de auditoria e evidências de QA recentemente promovidas.[1] [2] [3]

> **Síntese executiva.** A plataforma está operacionalmente estruturada, com `main` publicado, CI verde e uma linha de QA de homologação capaz de testar um Preview protegido sem persistir tokens. A matriz autenticada foi concluída para Cliente, Administração, Backoffice e Caixa; uma falha de acesso direto ao Catálogo pelo papel Caixa foi corrigida, coberta por teste e revalidada no Preview. Permanecem **27 pendências materiais**. Nenhuma delas autoriza habilitar pagamentos em produção: o gate `PAYMENTS_ENABLED=false` deve continuar ativo até a conclusão explícita dos ensaios sandbox, revisão de evidências e decisão de liberação.[6]

## 1. Estado técnico consolidado

O merge da PR #19 está em `main` e foi publicado pela Vercel em Production. A alteração tornou o smoke de homologação reproduzível contra um Preview protegido: o acesso temporário é convertido em cookie somente em memória, o ambiente Production é recusado e o roteiro opera apenas em leitura.[4] [5]

| Dimensão | Estado atual | Evidência | Implicação para as pendências |
|---|---|---|---|
| Código e CI | **Saudável** | 193 testes aprovados; 3 ignorados intencionalmente; tipagem e build aprovados | Mudanças futuras devem manter essa linha de base e ampliar os testes nos fluxos hoje bloqueados por ambiente. |
| Homologação | **Pronta para smoke e matriz autenticada controlada** | Smoke remoto: 8 de 8 rotas aprovadas; matriz validada nos quatro papéis com contas sintéticas depois revogadas | Permite validar rotas públicas, RBAC e proteção de cron sem persistir a massa de QA; novos ensaios autenticados devem recriar identidades temporárias. |
| Produção | **Publicada e protegida** | Deployment do merge #19 em estado `READY` | Não deve receber dados sintéticos de pagamento, e-mail, estoque ou pedidos para fins de ensaio. |
| Pagamentos | **Implementação protegida; liquidação não concluída** | Contratos, webhook e idempotência cobertos; liquidação aprovada sandbox pendente | O gate de pagamentos permanece desabilitado em Production. |
| Autenticação | **Base pronta; reset de senha e provedores externos específicos pendentes** | Login por senha e RBAC foram validados na matriz; recuperação, Microsoft, Apple e SMS permanecem pendentes de execução/configuração | Os próximos ensaios devem usar somente identidades temporárias e caixa externa de QA. |
| Integrações e alertas | **Implementadas; validações de ciclo completo pendentes** | Sympla, Slack, outbox e cron possuem contratos e documentação | Restam ensaios controlados de alerta, e-mail e reprocessamento em ambiente isolado. |

## 2. Mapa de prioridade

As pendências foram classificadas conforme o risco operacional e a dependência. **P0** significa condição de segurança ou validação indispensável antes de habilitar uma operação financeira; **P1** afeta capacidade operacional ou governança; **P2** depende principalmente de definição de negócio, conteúdo ou provedor externo.

| Prioridade | Quantidade | Natureza predominante | Próximo movimento recomendado |
|---|---:|---|---|
| P0 | 8 | Pagamento sandbox, identidade de homologação, e-mail e ensaio de eventos pagos | Executar apenas em homologação com massa sintética e evidências de reversão. |
| P1 | 12 | Auditoria autenticada, concorrência QR, alertas, outbox, conciliação e catálogo | Programar por trilhas técnicas e manter cada mudança em PR pequena. |
| P2 | 8 | Políticas comerciais, automações, formatos de tabelas e novos provedores OAuth/SMS | Solicitar a decisão, credencial ou insumo de negócio antes da implementação. |

## 3. Pendências financeiras e comerciais

Esta trilha contém as operações que podem afetar cobrança, estoque, retirada ou atendimento presencial. Todas devem permanecer em homologação até que os critérios de aceite sejam comprovados. A pendência de POS aparece duas vezes no checklist, mas representa a mesma entrega operacional e deve ser tratada como uma única iniciativa com duas referências históricas.[1]

| IDs do checklist | Pendência | Status real | Bloqueio ou dependência | Critério de aceite | Próxima ação segura |
|---|---|---|---|---|---|
| 16 e 80 | Integração e atendimento presencial Mercado Pago POS | **Não iniciada em ambiente real**; contratos de resiliência já existem | Dispositivo Point, credenciais POS e escopo comercial da conta | Criar ordem, receber webhook válido, aplicar idempotência e conciliar sem duplicar venda/estoque | Solicitar o terminal e as credenciais exclusivamente de teste; criar plano de pareamento e rollback. |
| 63 | Concluir loja, estoque, lotes, retirada e conciliação | **Item guarda-chuva**; grande parte está implementada | Falta desmembrar o que ainda não foi validado de ponta a ponta | Checklist atômico para catálogo, reserva, retirada, lote e conciliação aprovado | Substituir esse item por subitens rastreáveis depois da auditoria autenticada. |
| 67 | Ativar lotes de pré-venda | **Aguardando decisão comercial** | Sinal, quantidade mínima, prazo e política de estorno | Política aprovada, lote configurado em homologação e fluxo de cancelamento testado | Registrar a regra comercial antes de ativar qualquer lote. |
| 190, 209–211 e 220 | Liquidação sandbox aprovada e replay idempotente | **Preparação parcialmente concluída**; pagamento aprovado ponta a ponta não foi evidenciado | Identidades, produto, pedido, pagador, Preview e sessão compradora de teste isolada | Pagamento aprovado, webhook assinado, reserva/baixa idempotente e replay sem efeitos duplicados | Executar a cadeia sequencial indicada na seção 6, sem cartões ou contas de Production. |
| 233 | Venda, pagamento, emissão, sincronização e check-in de ingresso | **P0 dependente da liquidação sandbox** | Fluxo de pagamento aprovado e evento sintético de homologação | Ingresso emitido, sincronizado e validado por check-in idempotente | Executar após os itens 190 e 209–211; usar evento e usuário sintéticos. |
| 294 | Adicionar produtos institucionais ao catálogo público | **Aguardando conteúdo aprovado** | Produtos, descrições, preço, estoque e imagens já existentes fornecidos pela gestão | Cadastro visível em ERP, landing e loja; sem gerar ativo visual novo | Receber a lista institucional e cadastrar como rascunho para revisão. |
| 303 | Revisar preços e estoque existentes | **Deliberadamente bloqueada** | Confirmação expressa da Presidência/gestão | Relatório de divergências aprovado; correção auditada | Fazer somente inventário de inconsistências; não alterar valores nem quantidades sem autorização específica. |

## 4. Pendências de QA, segurança e integrações

O smoke remoto atual confirma que landing, loja, eventos, login, recuperação de senha e configuração pública respondem normalmente em homologação; também confirma que `/admin` redireciona ao login e que o cron rejeita chamada não autorizada. Isso reduz risco de regressão de rota, mas não substitui testes autenticados nem ensaios de efeitos externos.[2] [3]

| ID | Pendência | Status real | Dependência | Critério de aceite | Próxima ação segura |
|---:|---|---|---|---|---|
| 95 | Suíte concorrente de QR em banco exclusivo de testes | **Não executada contra banco dedicado** | `TEST_SUPABASE_DB_URL` de projeto exclusivo e migrações aplicadas | Corridas simultâneas de retirada/check-in aprovadas sem perda ou duplicação | Provisionar banco efêmero de testes e executar o script com bloqueio explícito contra Production. |
| 180 | Alerta Slack de degradação e recuperação semanal | **Contrato implementado; ciclo completo pendente** | Canal de homologação ou janela de teste aprovada | Um alerta de degradação, uma recuperação e nenhuma duplicação indevida | Injetar falha controlada na homologação e comparar `integration_alerts` com a mensagem entregue. |
| 232 | Entrega real de e-mails de autenticação e transacionais | **Pendente de caixa externa controlada** | Caixa de recepção, remetente/dominio e rastreabilidade Resend | Autenticação e e-mail transacional entregues, com remetente e correlação confirmados | Usar caixa QA externa e dados sintéticos; não testar com listas reais. |
| 234 | Alertas Sympla, deduplicação e dead letters | **Contratos presentes; evidência externa incompleta** | Falha simulada na integração e Slack disponível | Alerta único por incidente, recuperação enviada e reprocessamento auditável | Criar uma dead letter sintética em homologação e observar o ciclo completo. |
| 252 | Login por e-mail e senha em homologação | **Concluída na matriz autenticada** | — | Login, sessão e proteção de rota por papel comprovados | Manter a evidência sanitizada; recriar contas temporárias apenas para novos ensaios. |
| 254 | Conclusão de reset de senha em homologação | **Pendente de execução externa** | Caixa QA e identidade com senha controlada | E-mail, callback, nova senha e login subsequente confirmados | Rodar junto ao item 252 com senha temporária e revogação posterior. |
| 304 | Auditoria E2E do ERP | **Parcialmente realizada**; a matriz autenticada confirmou os quatro papéis e corrigiu uma negação de rota ausente | Ensaios funcionais adicionais de escrita segura para pedidos, automações, integrações e tabelas | Cenários por papel em catálogo, pedidos, eventos, ODS, automações, integrações e tabelas | Expandir a auditoria somente com massa temporária e não financeira, a partir da matriz já concluída. |
| 337 | Ensaio da outbox de e-mails | **Implementado em contrato; não ensaiado no banco isolado** | Banco de homologação, fila sintética e caixa QA | Idempotência, retry, concorrência e descarte/auditoria confirmados | Preparar filas sintéticas e executar sem endereços de usuários reais. |

## 5. Pendências de governança, automações e identidade

Estas pendências dependem de definição institucional ou de contas externas. Não são falhas de código já comprovadas; são decisões de negócio e credenciais que não devem ser presumidas nem substituídas por dados fictícios.

| ID | Pendência | Status real | Insumo necessário | Critério de aceite | Responsável sugerido |
|---:|---|---|---|---|---|
| 72 | Expandir automações por setor | **Aguardando prioridades de negócio** | Três regras por setor, com gatilho, ação, destinatário e exceções | Regras modeladas, testadas e aprovadas pela diretoria responsável | Diretores de cada setor e Presidência. |
| 76 | Kanban, Calendário e Galeria no Construtor | **Aguardando definição de tabelas** | Três primeiras tabelas e campos por setor | Visual apropriado para cada tabela, permissões e dados de teste aprovados | Líderes de setor e equipe administrativa. |
| 350 | Microsoft OAuth | **Bloqueado por credencial externa** | Registro de aplicativo no Microsoft Entra ID | Callback, login, vínculo de conta e negação segura testados em homologação | Administrador Microsoft/Presidência. |
| 351 | Apple OAuth | **Bloqueado por credencial externa** | Conta Apple Developer, Service ID, chave e domínio verificado | Callback e login Apple aprovados em homologação | Titular da conta Apple Developer/Presidência. |
| 352 | Telefone e MFA por SMS | **Pendente de decisão de fornecedor** | Provedor, orçamento, CAPTCHA, limites e política de retenção | Envio, validação, rate limit, recuperação e custo controlados | Presidência, financeiro e responsável LGPD. |

## 6. Ordem recomendada de execução

A sequência abaixo minimiza retrabalho e preserva a separação entre homologação e produção.

| Ordem | Bloco | Resultado esperado | Condição de parada |
|---:|---|---|---|
| 1 | Recuperação de senha e encerramento da auditoria E2E: itens 254 e 304 | Conclusão do reset com caixa externa e cenários funcionais seguros adicionais | Interromper se houver acesso indevido, erro de rota ou escrita fora de homologação. |
| 2 | Outbox e alertas: itens 337, 180, 232 e 234 | Evidência de retry, deduplicação, recuperação e entrega externa controlada | Interromper se houver destinatário real, ruído repetido ou segredo exposto. |
| 3 | Concorrência QR: item 95 | Confirmação de atomicidade no banco exclusivo de teste | Interromper se a URL de banco não for explicitamente de teste. |
| 4 | Pagamento sandbox: itens 209–211, 190, 220 e 233 | Liquidação de produto e ingresso sintéticos, webhook e replay idempotente | Interromper imediatamente se o alvo apontar a Production ou se `PAYMENTS_ENABLED` estiver ativo nela. |
| 5 | Decisões de negócio: itens 67, 72, 76, 294 e 303 | Políticas, listas e aprovações documentadas | Não implementar valores, estoque, produto ou automação sem decisão explícita. |
| 6 | POS e novos provedores: itens 16/80 e 350–352 | Integrações externas configuradas e homologadas | Iniciar somente após receber o dispositivo, as credenciais ou a aprovação de custo. |
| 7 | Encerramento documental: itens 85 e 212 | Evidência de gate de pagamento e dossiê final de reestruturação | Fechar apenas com revalidação de Production e revisão do checklist. |

## 7. Itens que podem ser encerrados por reconciliação

Dois itens exigem rechecagem documental antes de receberem baixa, pois as evidências mais recentes indicam que parte do trabalho já ocorreu.

| ID | Por que não deve ser tratado como desenvolvimento novo | Verificação necessária para encerrar |
|---:|---|---|
| 85 | A plataforma já possui releases controlados em Vercel; a pendência é confirmar novamente a presença de `PAYMENTS_ENABLED=false` em Production e Preview, não publicar código sem validação | Consulta sanitizada da configuração e confirmação do deployment atual. |
| 212 | Testes, build e revalidações de acessibilidade foram repetidos em revisões recentes; falta consolidar a documentação final da reestruturação | Atualizar o dossiê de reestruturação com a PR #19, a linha de base de acessibilidade e este relatório. |

## 8. Limites operacionais e segurança

Não é recomendado tentar concluir pendências financeiras, de catálogo ou de estoque diretamente em Production. A política vigente requer confirmação explícita para qualquer alteração de preço ou quantidade. Da mesma forma, credenciais de Microsoft, Apple, SMS, POS e o dispositivo Point não podem ser inferidos, criados ficticiamente ou substituídos por credenciais de Production.

O smoke de homologação usa somente leitura e rejeita Production por desenho. Esse padrão deve ser mantido nos próximos ensaios; qualquer fluxo que escreva dados deve usar identidades, eventos, produtos, caixas de e-mail e banco exclusivamente sintéticos e isolados.[2]

## 9. Conclusão

O projeto não apresenta, nesta referência, uma pendência conhecida que justifique habilitar pagamentos em Production. Com a matriz autenticada de login e RBAC concluída, o próximo trabalho de maior valor é o **ensaio controlado de outbox e alertas**, seguido da conclusão de recuperação de senha e dos cenários E2E ainda não cobertos. A liquidação sandbox somente deve começar quando a identidade compradora, o produto, o pedido, o Preview e o webhook de teste estiverem explicitamente isolados.

## Referências

[1]: https://github.com/Mos754763/Atletica-Fsa/blob/main/todo.md "Checklist mestre de pendências — ATLETICA FSA"

[2]: https://github.com/Mos754763/Atletica-Fsa/blob/main/docs/qa/qa-homologacao-2026-08-20.md "Evidências de QA em homologação"

[3]: https://github.com/Mos754763/Atletica-Fsa/blob/main/docs/auditorias/auditoria-funcional-erp-inicial-2026-08-20.md "Auditoria funcional inicial do ERP"

[4]: https://github.com/Mos754763/Atletica-Fsa/pull/19 "PR #19 — acesso temporário para smoke de homologação"

[5]: https://github.com/Mos754763/Atletica-Fsa/commit/9ba8257dba70e0d2eca355e5226297ba966af345 "Merge da PR #19 em main"

[6]: https://github.com/Mos754763/Atletica-Fsa/blob/main/docs/qa/preparacao-qa-autenticado-2026-08-20.md "Matriz autenticada de QA em homologação"
