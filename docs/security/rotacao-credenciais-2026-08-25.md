# Roteiro controlado de rotação de credenciais

**Data:** 25 de agosto de 2026
**Escopo:** preparação de rotação preventiva após identificação de credenciais compartilhadas em conversas históricas. Este documento não contém valores, tokens, connection strings nem capturas de tela.

## Objetivo e princípio operacional

As chaves que podem ter sido compartilhadas fora de cofres de segredo devem ser consideradas potencialmente expostas e substituídas de forma controlada. A rotação deve preservar uma janela de validação, utilizar valores exclusivos por ambiente e revogar o valor anterior somente após comprovação de saúde do substituto.

| Ordem | Sistema | Material a rotacionar | Destino da nova configuração | Evidência mínima antes de revogar o anterior |
|---|---|---|---|---|
| 1 | GitHub | Tokens pessoais ou de automação | Secrets do GitHub ou autenticação de deploy aprovada | `gh auth status`, CI de leitura e deploy Preview sem erro de autorização |
| 2 | Supabase | Chave administrativa, senha/pooler de banco e chaves de serviço | Secrets de Vercel por ambiente e integrações de backend | RLS, funções administrativas e conexão de Homologação validadas sem expor dados |
| 3 | Resend | Chave de API e credenciais SMTP | Secrets de Vercel de Production/Preview e configuração Supabase SMTP | Envio QA em Homologação para caixa externa autorizada e registro esperado de entrega |
| 4 | Cloudflare Turnstile | Chave secreta do widget, se existente em integração server-side | Cofre de segredo do ambiente correspondente | Widget renderiza em navegador real, endpoint de verificação aceita token válido e recusa inválido |
| 5 | Sympla | Token da API | Secret exclusivo do ambiente integrado | Sincronização manual de Homologação sem dead letter nova e health `healthy` |
| 6 | Slack | URL de webhook de alertas | Secret de Vercel e, quando aplicável, GitHub Actions secret | Alerta de teste autorizado no canal correto, sem dados pessoais ou valores sensíveis |
| 7 | Mercado Pago | Access token, chave pública e segredo de webhook | Secrets de Homologação e Production mantidos separados | Sandbox valida preferência, assinatura e idempotência; Production fica inalterada enquanto `PAYMENTS_ENABLED=false` |

## Sequência por ambiente

O valor novo deve ser gerado no provedor, salvo diretamente no cofre de segredos do ambiente e nunca colado em issues, commits, arquivos `.env`, logs ou mensagens. Em **Homologação**, a nova configuração é validada primeiro com uma ação controlada e reversível. Em **Production**, a alteração só é feita após a evidência de Homologação e autorização explícita para aquele provedor.

| Ambiente | Pode usar chave dummy de teste | Pode processar escrita de QA | Pode receber chave de Production | Regra de reversão |
|---|---:|---:|---:|---|
| Desenvolvimento local | Sim | Apenas dados locais/QA | Não | Remover a variável local; não versionar arquivo de ambiente |
| Homologação/Preview | Sim, quando o provedor suportar | Sim, com dados QA aprovados | Não, exceto caso tecnicamente inevitável e aprovado | Restaurar secret anterior somente se ainda não tiver sido revogado |
| Production | Não | Somente com aprovação pontual | Sim | Aplicar durante janela observável e confirmar logs; revogar anterior apenas após o aceite |

## Controles para cada rotação

Antes de revogar uma credencial anterior, devem existir um responsável identificável, uma janela observável de logs, uma maneira de reverter e um teste mínimo documentado. A rotação de chaves de banco ou tokens administrativos nunca deve ser feita simultaneamente em todos os ambientes, pois isso impede a atribuição de falhas e amplia indisponibilidade.

Para GitHub e integrações de deploy, o novo token deve ter o menor escopo possível. Para webhooks, a rotação deve incluir a validação de assinatura com o segredo novo e a confirmação de que eventos com segredo anterior são rejeitados após o encerramento da janela. Para Mercado Pago, a rotação não autoriza pagamentos reais: `PAYMENTS_ENABLED=false` permanece obrigatório em Production até a homologação E2E de sandbox e aprovação independente.

## Itens que exigem aprovação antes de execução

A geração, substituição ou revogação de qualquer segredo em contas externas altera a disponibilidade e, em alguns casos, pode interromper integrações. Por isso, a execução será solicitada separadamente para cada provedor, acompanhada de impacto, ambiente, plano de reversão e teste de saúde. Esta preparação não rotacionou, exibiu ou reutilizou qualquer valor.
