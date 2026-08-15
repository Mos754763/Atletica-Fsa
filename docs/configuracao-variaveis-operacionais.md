# Configuração de Variáveis Operacionais — ATLETICA FSA

**Atualizado em:** 15 de agosto de 2026  
**Escopo:** Vercel, Supabase, Resend, Sympla, Slack e Mercado Pago.

## Princípios de segurança

> Uma variável marcada como **sensível** nunca deve ser exposta em componentes de navegador, commit, print, planilha pública ou conversa. Variáveis com o prefixo `NEXT_PUBLIC_` são entregues ao navegador e devem conter somente dados públicos.

Na Vercel, use **Production** e **Preview** para as integrações reais de homologação. Evite Development na Vercel; valores locais devem ficar exclusivamente em `.env.local`, que não é versionado. Depois de criar ou alterar uma variável, faça um novo deployment para que as funções server-side recebam o valor atualizado.

## Variáveis obrigatórias na Vercel

| Variável | Tipo | Ambientes | Valor/origem correta | Situação e observação |
| --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Pública | Production e Preview | Produção: `https://atletica-fsa.vercel.app`; Preview: URL de preview compatível com Supabase Auth. | Configurada. Não contém segredo. |
| `NEXT_PUBLIC_SUPABASE_URL` | Pública | Production e Preview | URL do projeto Supabase. | Configurada. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Pública | Production e Preview | Chave publicável do Supabase. | Configurada; não usar chave secreta neste campo. |
| `SUPABASE_SECRET_KEY` | Sensível | Production e Preview | Chave de serviço do Supabase. | Configurada; somente em rotas server-side. |
| `CRON_SECRET` | Sensível | Production e Preview | Cadeia aleatória longa, exclusiva e não reutilizada. | Configurada; protege as rotas de cron. |
| `SYMPLA_API_TOKEN` | Sensível | Production e Preview | Token privado da API Sympla com acesso de leitura aos eventos da conta. | Configurada, mas precisa ser revalidada se o cron retornar `403`. |
| `SLACK_SYMPLA_ALERT_WEBHOOK_URL` | Sensível | Production e Preview | URL de Incoming Webhook do canal Slack da operação. | Configurada em 15/08/2026; não revelar a URL. |
| `RESEND_API_KEY` | Sensível | Production e Preview | API Key criada no painel Resend. | Configurada; a entrega externa depende do remetente/domínio ou SMTP tratado no Supabase. |
| `EMAIL_FROM` | Servidor | Production e Preview | Ex.: `ATLETICA FSA <remetente@dominio-verificado>`. | Configurada. Sem domínio próprio, conservar um remetente permitido pelo provedor. |

## Mercado Pago: configuração por fase

| Variável | Tipo | Ambientes | Valor/origem correta | Estado de uso |
| --- | --- | --- | --- | --- |
| `PAYMENTS_ENABLED` | Servidor | Production e Preview | **`false`** durante homologação. | **Adicionar explicitamente agora.** A ausência também bloqueia pagamentos, mas o valor explícito elimina ambiguidades. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Sensível | Production e Preview | Access Token de teste durante homologação; token produtivo apenas no lançamento. | Configurada. Exclusiva de servidor. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Sensível | Production e Preview | Segredo de assinatura gerado para o endpoint de Webhooks configurado. | Configurada. Não é o Access Token. |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Pública | Somente se adotado | Public Key do Mercado Pago. | Não necessária ao Checkout Pro atual; só adicionar se um fluxo futuro no navegador exigir SDK do Mercado Pago. |

Enquanto `PAYMENTS_ENABLED=false`, o checkout e a conciliação comercial respondem como indisponíveis. O endpoint continua protegido e pode ser avaliado em testes seguros, mas nenhum pedido, ingresso ou estoque será liquidado.

## Valores exclusivamente locais ou de testes

| Variável | Onde usar | Regra |
| --- | --- | --- |
| `SUPABASE_DB_URL` | Máquina local para migrations, schema e `pnpm diagnose:cron`. | **Nunca cadastrar na Vercel.** A ferramenta de diagnóstico usa apenas `SELECT`. |
| `TEST_SUPABASE_PROJECT_REF`, `TEST_SUPABASE_URL`, `TEST_SUPABASE_SECRET_KEY`, `TEST_SUPABASE_DB_URL` | Projeto Supabase isolado para testes de concorrência. | Nunca apontar para produção. |
| `RUN_QR_CONCURRENCY_TESTS` | Comando local de teste de concorrência. | Habilitar apenas com banco de testes válido. |

## Diagnóstico manual de cron

Após criar um `.env.local` local com uma `SUPABASE_DB_URL` de leitura, execute:

```bash
pnpm diagnose:cron
```

Para automação de terminal ou evidência estruturada, use:

```bash
pnpm diagnose:cron -- --json
```

O resultado é somente leitura e classifica cada rota como `healthy`, `stale`, `failed` ou `missing`. A primeira execução após uma publicação pode retornar `missing`; use `--allow-missing` exclusivamente durante essa janela inicial. O código de saída é `0` para saudável, `1` para ausência ainda não permitida e `2` para falha ou atraso.

## Checklist imediato na Vercel

1. Adicione `PAYMENTS_ENABLED` com o valor literal `false` em **Production** e **Preview**.
2. Confirme que `SLACK_SYMPLA_ALERT_WEBHOOK_URL` continua marcada como **Sensitive** e aplicada a **Production** e **Preview**.
3. Faça um novo deployment do commit que contém o diagnóstico de cron; variáveis novas somente chegam às funções em deployments posteriores.
4. Não altere `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `CRON_SECRET` nem `SUPABASE_SECRET_KEY` durante esta validação.
5. Para confirmar o Slack, autorize uma única mensagem técnica controlada após o deployment ficar **Ready**.
