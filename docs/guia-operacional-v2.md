# Guia operacional — ATLETICA FSA v2

> Este guia descreve a operação após a expansão de governança, loja, automações, Construtor de Tabelas e ingressos. Pagamentos reais permanecem bloqueados por configuração até que a diretoria conclua os gates externos de hospedagem e Mercado Pago.

## Rotina da Presidência

A Presidência começa em **ERP → Governança**, onde pode criar ou desativar setores, vincular pessoas, designar o único diretor ativo por setor e registrar concessões de acesso específicas. A troca de diretor encerra o vínculo anterior e preserva o histórico, portanto não se deve excluir pessoas para representar uma troca de gestão.

Em **ERP → Automações**, a Presidência mantém os templates de e-mail e as regras de disparo. Regras inativas não afetam a operação. Uma alteração de texto não reenfileira mensagens já processadas; ela vale para as próximas ocorrências do evento configurado.

| Momento | Conferência | Resultado esperado |
|---|---|---|
| Entrada de nova pessoa | Criar vínculo no setor e selecionar papel organizacional | A pessoa recebe somente a área e as ações necessárias. |
| Troca de diretor | Registrar o novo diretor no setor | O vínculo anterior é encerrado, mantendo rastreabilidade. |
| Mudança de privilégio | Preferir concessão por recurso/ação a um novo papel global | O princípio do menor privilégio é preservado. |
| Revisão mensal | Consultar auditoria, lixeira e automações | Alterações e erros operacionais ficam rastreáveis. |

## Rotina de loja e retirada

O catálogo é mantido em **ERP → Catálogo**. Produtos físicos podem ter variações como tamanho e cor; cada variação possui preço e saldo próprios. Lotes de pré-venda devem nascer em rascunho e só podem ser ativados depois de a diretoria definir sinal, quantidade mínima e política de estorno.

Quando um pedido é iniciado, o banco reserva o estoque de forma atômica. Após pagamento confirmado pelo webhook, a baixa de estoque é liquidadada uma única vez. Reservas não pagas vencem pela manutenção programada. No atendimento, o Backoffice abre o ODS, move o pedido para preparo e confirma a retirada digitando ou escaneando o código/QR exibido ao cliente.

> Não entregue um pedido apenas porque ele aparece como criado. O estado correto para retirada é o fluxo pago → em preparo → pronto, seguido da validação do código de retirada no ODS.

## Rotina de eventos e ingressos

Em **ERP → Eventos**, a administração cria o evento como divulgação, abre inscrições e só então publica lotes de ingresso. Cada lote inicia como rascunho; a publicação exige que o evento esteja com inscrições abertas e que ainda haja quantidade disponível.

Participantes autenticados recebem o ingresso na área **Conta → Eventos** após a liquidação do pagamento. O QR representa o código de check-in e é de uso único. O caixa ou administração pode escanear/digitar o código na operação de eventos. Um ingresso emitido pode ser transferido antes do uso; ingressos pendentes, usados ou cancelados não são transferíveis.

## Rotina de comunicação

E-mails de status, confirmação e eventos são colocados em fila. O cron protegido processa mensagens por prioridade, registra tentativas e permite reprocessamento seguro por idempotência. A rotina diária também remove reservas de estoque vencidas. Se o e-mail não chegar, a equipe deve consultar o histórico da fila antes de reenviar manualmente.

## Construtor de Tabelas

O Construtor permite que um setor crie tabelas de trabalho sem editar o banco de dados principal. Campos são metadados tipados, e registros ficam em JSONB validado. O uso apropriado é para processos internos como patrocínios, materiais, cronogramas e escala de jogos; pedidos, pagamentos e dados financeiros continuam nos módulos próprios.

Registros apagados do Construtor são enviados à lixeira e podem ser restaurados. O primeiro ciclo deve começar com três tabelas por setor e uma visão de lista por tabela. Formatos Kanban, Calendário e Galeria dependem dessa definição inicial para não criar uma interface vazia ou sem critérios de agrupamento.

## Gates antes da primeira venda real

| Gate | Evidência obrigatória |
|---|---|
| Hospedagem | Plano comercial compatível ou provedor alternativo aprovado. |
| Mercado Pago | Token de produção, webhook assinado e pagamento real controlado concluído. |
| Resend e Supabase | Domínio/remetente e SMTP de autenticação validados. |
| Estoque | Produtos/variações, saldo inicial e local/prazo de retirada revisados. |
| Eventos | Lotes publicados e um check-in de teste concluído. |
| Operação | Presidente, diretor de setor, caixa e Backoffice treinados no fluxo correspondente. |
