# Auditoria de Webhooks e Notificações

**Projeto:** ATLETICA FSA  
**Data:** 15 de agosto de 2026  
**Responsável:** Manus AI

## Evidência de configuração de ambiente

O painel de variáveis da Vercel confirma, sem exposição de valores, que as variáveis abaixo estão cadastradas para **Production e Preview**:

| Variável | Integração associada | Evidência de configuração |
| --- | --- | --- |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Assinatura das notificações Mercado Pago | Atualizada recentemente. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Consulta e conciliação server-side Mercado Pago | Atualizada recentemente. |
| `SYMPLA_API_TOKEN` | Sincronização server-side de catálogo Sympla | Cadastrada para os dois ambientes. |
| `CRON_SECRET` | Autorização das rotas cron internas | Cadastrada para os dois ambientes. |
| `RESEND_API_KEY` | Envio transacional por e-mail | Cadastrada para os dois ambientes. |

Os valores não foram visualizados, copiados ou registrados neste relatório. A presença das variáveis comprova a configuração necessária, mas não substitui o teste operacional autenticado de cada integração.

## Inventário inicial

O repositório contém um receptor externo de Webhook Mercado Pago, rotas cron autenticadas, integração Sympla por consulta periódica e alertas de saída para Slack. Não há receptor de Webhook Sympla, Discord ou Telegram no código atual.

## Verificações do painel

| Verificação | Resultado observado | Interpretação |
| --- | --- | --- |
| Variável `SLACK_SYMPLA_ALERT_WEBHOOK_URL` na Vercel | Não encontrada na lista do projeto. | Os alertas Slack existentes no código não serão entregues em produção enquanto a variável não for adicionada para Production e Preview. |
| Painel de notificações Mercado Pago | A sessão do navegador solicitou login. | Não foi possível confirmar remotamente os tópicos habilitados sem autenticação da conta Mercado Pago. A auditoria de código permanece válida; a confirmação visual do painel depende de uma sessão autenticada. |
| Variável `PAYMENTS_ENABLED` na Vercel | Não aparece na lista de variáveis do projeto. | O código interpreta a ausência como `false`; portanto, o receptor Mercado Pago permanece bloqueado de modo seguro com `503` até a homologação e a ativação explícita. |

## Monitoramento já implementado

A rota semanal `/api/cron/integration-health` exige `Authorization: Bearer ${CRON_SECRET}`, verifica os heartbeats diários de Sympla e lembretes, classifica atraso/falha, persiste o estado, deduplica alertas e cria trilha de atividade no CRM. Quando o Slack estiver configurado, ela entrega alertas de pico e recuperação pelo mesmo mecanismo de deduplicação.

O alerta Slack atual possui timeout de oito segundos e trata resposta não-2xx ou falha de rede como erro de entrega, preservando o registro de auditoria. Sua indisponibilidade não reverte pagamento, pedido, inscrição ou sincronização.

## Canais alternativos avaliados

| Canal | Mecanismo disponível | Credenciais necessárias | Aderência ao projeto |
| --- | --- | --- | --- |
| Discord | Webhook de entrada HTTP com URL/token do canal. | Uma URL secreta de Webhook Discord. | Boa opção para um canal operacional único; o payload pode seguir a estrutura atual de alertas Slack. |
| Telegram | Bot API HTTPS com método `sendMessage`. | Token do bot e identificador do chat. | Boa opção para aviso direto a responsáveis; exige dois segredos e gestão do bot. |
| Slack | Webhook de entrada HTTP já suportado pelo código. | `SLACK_SYMPLA_ALERT_WEBHOOK_URL`; variável ainda ausente na Vercel. | Menor esforço técnico, pois os alertas e testes já estão implementados. |

O Discord documenta que Webhooks de entrada publicam mensagens no canal por URL gerada, e o Telegram documenta sua Bot API como interface HTTP que exige token por bot. [1] [2]

## Matriz operacional de webhooks e notificações

| Integração ou rota | Direção | Situação atual | Validação observável | Conclusão |
| --- | --- | --- | --- | --- |
| Mercado Pago — `/api/payments/mercado-pago/webhook` | Entrada | Código, HMAC, anti-replay e segredos Vercel presentes; `PAYMENTS_ENABLED` ausente e, portanto, falso. | O painel Mercado Pago não pôde ser consultado sem login; não foi disparado pagamento real ou teste assinado. | **Seguro, porém deliberadamente inativo.** Não está apto a liquidar pagamentos até homologação e ativação explícita. |
| Sympla | Saída por API / entrada por cron | Token presente; sincronização usa consulta autenticada periódica e não Webhook de entrada. | Cron diário está registrado; ainda não havia uma invocação automática no recorte de logs. | **Configurado, mas sem evidência de primeira execução automática.** Confirmar após a janela diária. |
| Slack — alerta Sympla | Saída HTTP | Código de alerta, timeout, deduplicação e trilha CRM existentes. | A variável `SLACK_SYMPLA_ALERT_WEBHOOK_URL` não existe na Vercel. | **Não funcional em produção** até que o segredo seja configurado e um teste de entrega seja autorizado. |
| Vercel Cron — lembretes, Sympla e saúde | Invocação interna | Três jobs habilitados com agendas compatíveis com o plano Hobby. | A configuração aparece no painel Vercel; logs ainda sem invocações da nova agenda. | **Agendado; execução ainda pendente de evidência.** |
| Resend | Saída por API | Chave presente na Vercel; não é um Webhook. | A entrega externa continua dependente da solução SMTP/domínio já identificada separadamente. | **Fora do escopo de Webhooks.** |
| Discord | Saída HTTP futura | Não há endpoint, variável ou código configurado. | Não aplicável. | **Não implementado.** |
| Telegram | Saída HTTP futura | Não há bot, token, chat ID ou código configurado. | Não aplicável. | **Não implementado.** |

## Recomendação de próximo passo

O menor caminho de menor risco é concluir primeiro o **Slack**, porque o código e a persistência de alertas já existem. Basta cadastrar a URL de Webhook como segredo de Production e Preview, publicar o deployment e autorizar um único alerta de teste controlado. Discord é a alternativa com menor adaptação caso a equipe prefira centralizar alertas lá; Telegram é mais adequado a alertas diretos aos responsáveis, mas requer bot e `chat_id` além do token.

Uma verificação periódica adicional por CLI não deve ser criada no ambiente local, pois ele não é um executor persistente. A verificação programada já deve ser executada pela Vercel Cron e registrar heartbeats no Supabase. Um script de consulta é útil como ferramenta manual de diagnóstico ou como comando CI, mas não substitui o cron de produção.

## Referências

[1]: https://docs.discord.com/developers/resources/webhook "Discord Developer Documentation — Webhook Resource"
[2]: https://core.telegram.org/bots/api "Telegram Bot API"
