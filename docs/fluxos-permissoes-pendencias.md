# Fluxos operacionais, permissões e pendências externas

> **Estado registrado em 14 de agosto de 2026.** Este documento descreve o funcionamento esperado pelo código atual. Ele separa permissões de tela, controles server-side e configurações externas que ainda precisam ser confirmadas para operação comercial real.

## 1. Fluxos operacionais

### 1.1 Entrada, autenticação e conta

O visitante começa na landing page e pode navegar por setores, produtos e eventos sem se autenticar. Para comprar, consultar pedidos, inscrever-se ou entrar em áreas internas, ele acessa `/login`. Há dois caminhos: e-mail/senha e Google OAuth. No OAuth, o provedor retorna à rota `/auth/callback?next=/conta`; a rota troca o código por sessão e aceita apenas destinos internos iniciados por `/`, evitando redirecionamento para site externo.

Depois do login, a pessoa é direcionada a `/conta`. Essa página lê o perfil, mostra o papel vigente e fornece os atalhos adequados. Um usuário novo opera como **Cliente** até ser promovido por uma administradora ou administrador. Caso não exista sessão, rotas protegidas redirecionam para `/login`; quando existe sessão mas o papel não é suficiente, o redirecionamento é para `/conta?acesso=negado`.

| Etapa | Ação do usuário | Controle aplicado | Resultado |
|---|---|---|---|
| 1 | Navegar por conteúdo público | Nenhum login necessário | Descoberta institucional, loja e agenda. |
| 2 | Entrar por senha ou Google | Supabase Auth | Criação ou recuperação de sessão. |
| 3 | Retornar do provedor | Callback com destino seguro | Redirecionamento para `/conta`. |
| 4 | Acessar área interna | `requireRole()` no servidor | Acesso, login obrigatório ou bloqueio por papel. |
| 5 | Sair da conta | Encerramento de sessão | Retorno à navegação pública. |

### 1.2 Venda online, pagamento e retirada

O cliente seleciona produtos ativos, informa a forma de atendimento — retirada ou consumo local — e envia o carrinho. A API valida sessão, formato do carrinho, atividade dos produtos e estoque antes de criar o pedido. Em seguida, grava pedido, itens e o primeiro evento de histórico com o estado `aguardando_pagamento`.

Com um token válido, o servidor cria a preferência do **Mercado Pago Checkout Pro** e devolve ao navegador a URL do checkout. Se a preferência não puder ser criada, o pedido é cancelado de forma controlada. Quando o Mercado Pago notifica a aplicação, o webhook valida a assinatura, busca o pagamento na fonte do provedor e compara o valor recebido com o total do pedido antes de registrar o pagamento e alterar o status.

| Estado operacional | Quem o produz | Próxima etapa |
|---|---|---|
| `aguardando_pagamento` | API de checkout | Aguardar confirmação do Mercado Pago. |
| `pago` | Webhook validado | Entrar na fila do ODS. |
| `em_preparo` | Backoffice no ODS | Preparar pedido. |
| `pronto` | Backoffice no ODS | Liberar para retirada/consumo. |
| `cancelado` | Falha de checkout ou evento de pagamento | Encerrar o pedido mantendo histórico. |

O e-mail transacional acompanha as mudanças de status. A concorrência na operação é protegida: a atualização do ODS só é confirmada se o status atual ainda for o esperado, reduzindo o risco de duas pessoas sobrescreverem a mesma transição.

### 1.3 ODS e preparo

Pedidos pagos, em preparo e prontos são exibidos no **Order Display System**. A fila é atualizada em tempo real pelo Supabase. O Backoffice consulta os pedidos pagos, inicia o preparo e sinaliza que o item está pronto; o sistema registra o histórico e dispara a notificação ao cliente quando aplicável.

O ODS não é uma tela pública. A rota e a API correspondente permitem somente **Administração** e **Backoffice**. O papel Caixa pode acompanhar o ERP, pedidos e relatórios, mas não pode abrir ou alterar a fila de preparo.

### 1.4 Eventos, inscrição e check-in

A diretoria cria e atualiza eventos no módulo administrativo. O público vê a agenda e, autenticado, acompanha as próprias inscrições em `/conta/eventos`. O fluxo cobre abertura de inscrições, registro do participante, confirmação, check-in por código e acompanhamento do evento.

Um cron diário procura eventos que acontecerão aproximadamente nas próximas 24 horas e envia lembretes às inscrições confirmadas ou já registradas para check-in. A rota aceita apenas chamadas com o segredo `CRON_SECRET`, de modo que o agendador da Vercel é quem deve executá-la.

### 1.5 Membros, convites e mudança de papéis

Na área de membros, a Administração convida pessoas por e-mail e define o papel inicial. Após a ativação, o perfil é atualizado com nome e função. A alteração de papel também é administrativa e inclui duas proteções: uma pessoa não pode alterar o próprio papel e o sistema não permite remover o último administrador existente.

Esse fluxo depende do envio de e-mails de autenticação pelo Supabase. O Resend usado pela aplicação para e-mails transacionais é uma integração separada; para convites confiáveis, o SMTP do Resend precisa estar configurado no painel do Supabase.

### 1.6 Gestão administrativa e indicadores

O ERP organiza catálogo, pedidos, eventos, membros e relatórios em uma área lateral única. A visão geral expõe indicadores de faturamento, ticket médio, fila e SLA. Filtros permitem analisar pedidos, membros, catálogo, eventos e relatórios por condição operacional, sem alterar os dados por simples consulta.

## 2. Matriz de permissões

O valor técnico do papel **`cozinha`** é apresentado na interface como **Backoffice**. As decisões críticas são verificadas no servidor, e não somente pela presença ou ausência de botões na interface.

| Capacidade | Cliente | Caixa | Backoffice | Administração |
|---|---:|---:|---:|---:|
| Navegar na landing, loja e agenda | Sim | Sim | Sim | Sim |
| Entrar e ver a própria conta | Sim | Sim | Sim | Sim |
| Ver próprios pedidos e eventos | Sim | Sim | Sim | Sim |
| Criar pedido online | Sim | Sim | Sim | Sim |
| Acessar ERP (`/erp` e `/admin`) | Não | Sim | Sim | Sim |
| Consultar fila do ODS | Não | Não | Sim | Sim |
| Alterar estado do pedido no ODS | Não | Não | Sim | Sim |
| Acompanhar pedidos e relatórios operacionais | Não | Sim | Conforme necessidade operacional | Sim |
| Gerir catálogo e eventos | Não | Ações sensíveis dependem de validação administrativa | Ações sensíveis dependem de validação administrativa | Sim |
| Convidar membros e definir papéis | Não | Não | Não | Sim |
| Alterar administradores | Não | Não | Não | Sim, com proteção do último admin |

> **Importante:** o acesso ao shell visual do ERP é permitido para Caixa, Backoffice e Administração. Porém, operações críticas — como convite e alteração de papéis — aplicam validação específica no servidor e continuam exclusivas da Administração. Não se deve inferir autorização de alteração apenas porque uma pessoa consegue abrir o ERP.

## 3. Pendências externas

As pendências abaixo não representam falha de desenvolvimento; são configurações, credenciais ou confirmações que pertencem a contas de terceiros e são necessárias para colocar cada fluxo em operação real.

| Dependência externa | Responsável provável | O que falta confirmar ou fornecer | Impacto enquanto pendente |
|---|---|---|---|
| Mercado Pago — Checkout Pro | Administração da conta Mercado Pago | Token de produção válido e teste de pagamento real de baixo valor. | O código do checkout existe, mas a API retorna indisponibilidade se o token não estiver válido. |
| Mercado Pago — webhook | Administração da conta Mercado Pago | Cadastro da URL pública do webhook e o segredo de assinatura correspondente. | Pagamentos não podem ser confirmados de forma automática e segura. |
| Mercado Pago POS | Administração da conta Mercado Pago / operação presencial | Identificador do dispositivo/caixa e escopo de integração autorizado. | A venda de maquininha ainda não é conciliada automaticamente com o pedido. |
| Resend — domínio de envio | Administração do domínio e da conta Resend | Verificar domínio/remetente de produção em `EMAIL_FROM`. | E-mails podem permanecer com remetente de teste ou com restrições do provedor. |
| Supabase — SMTP de autenticação | Administração do Supabase e Resend | Confirmar SMTP do Resend no Supabase para convites, recuperação de senha e limites adequados. | Convites e e-mails do Auth podem sofrer limites ou não usar a identidade FSA. |
| Vercel — deploy e cron | Administração da Vercel | Confirmar que as variáveis de produção estão preenchidas com valores válidos e que o cron está ativo. | Lembretes automáticos de evento e fluxos dependentes de segredo podem não executar. |
| Teste integrado de produção | Responsável pela operação | Realizar uma compra real controlada, receber webhook, movimentar o ODS e testar e-mail. | O sistema permanece validado em código e build, mas sem evidência de ponta a ponta no ambiente financeiro real. |

As referências de configuração são as documentações oficiais de [Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs), [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [Resend](https://resend.com/docs) e [Vercel Cron](https://vercel.com/docs/cron-jobs).[1][2][3][4]

## 4. O que está aguardando resposta agora

**Não há nenhuma pergunta ou aprovação pendente de resposta imediata.** O código, os testes e a sincronização com GitHub foram concluídos no ciclo recente. O único trabalho automático em andamento é a finalização do novo asset transparente do mascote, que não exige intervenção do responsável.

Para transformar as pendências externas em ações, a resposta mais útil quando você quiser avançar é escolher uma destas frentes: **(1)** enviar/configurar as credenciais finais do Mercado Pago e cadastrar o webhook; **(2)** informar os dados da maquininha POS; **(3)** confirmar o domínio e remetente do Resend; ou **(4)** solicitar a execução de um teste integrado de produção. Nenhuma delas bloqueia a leitura, o acesso ou a operação não financeira já implementada.

## Referências

[1]: https://www.mercadopago.com.br/developers/pt/docs "Documentação do Mercado Pago"
[2]: https://supabase.com/docs/guides/auth/auth-smtp "Supabase Auth SMTP"
[3]: https://resend.com/docs "Documentação do Resend"
[4]: https://vercel.com/docs/cron-jobs "Vercel Cron Jobs"
