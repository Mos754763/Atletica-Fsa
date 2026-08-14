# Publicação controlada e configurações externas

## Estado desta versão

O commit de produto **`191d33a`** foi sincronizado à ramificação `main` do repositório privado. Ele contém as evoluções de governança, comércio, retirada, automações, Construtor de Tabelas, eventos e ingressos, junto das migrações já aplicadas no Supabase.

| Área | Situação | Ação necessária antes do lançamento comercial |
|---|---|---|
| Banco Supabase | Migrações da versão aplicadas. | Não reaplicar as migrações versionadas. |
| Autenticação Supabase | Implementada e com callback de produção definido. | Confirmar os provedores e URLs ao trocar de domínio. |
| Vercel | Aguardando nova publicação da versão enviada ao GitHub. | Definir a variável de proteção abaixo e fazer o deploy. |
| Pagamentos Mercado Pago | Integração pronta, mas comercialmente bloqueada. | Manter o bloqueio até a validação da hospedagem e das credenciais. |
| E-mail Resend | Fila e templates implementados. | Verificar um domínio de remetente antes do envio real para clientes. |
| Workflow de CI | Preservado localmente, mas não publicado pelo token atual. | Adicionar o arquivo manualmente ou usar uma credencial com escopo `workflow`. |

## Ação obrigatória na Vercel

Cadastre a variável abaixo em **Production** e **Preview**, faça uma nova publicação e confirme no log que a variável foi carregada:

```text
PAYMENTS_ENABLED=false
```

> O sistema rejeita a criação de checkout e o processamento de webhooks enquanto o valor não for exatamente `true`. Não altere esse valor até concluir a validação de plano de hospedagem para uso comercial, as credenciais de produção do Mercado Pago e o teste de ponta a ponta com uma transação controlada.

Quando a operação estiver apta a receber pagamentos reais, configure os segredos `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET`, registre no Mercado Pago o endpoint abaixo e execute primeiro um teste de valor baixo em ambiente controlado:

```text
https://atletica-fsa.vercel.app/api/payments/mercado-pago/webhook
```

## E-mail e rotina agendada

O remetente de produção deve usar um domínio validado no Resend. O endereço de onboarding é apropriado apenas para testes e não deve ser tratado como remetente institucional definitivo. Após validar o domínio, atualize `EMAIL_FROM` na Vercel, preserve `RESEND_API_KEY` como segredo e faça uma publicação.

O arquivo `vercel.json` agenda a manutenção diária na rota de lembretes de eventos. A publicação deve preservar `CRON_SECRET`; após o deploy, confirme em Vercel que o cron está registrado e que a rota responde somente quando o segredo correto é apresentado.

## Pendência isolada de CI

O token que conseguiu publicar o commit de produto não possui o escopo GitHub `workflow`. Por esse motivo, o GitHub recusou somente `.github/workflows/ci.yml`; nenhum código funcional, migração, teste ou documentação de produto foi omitido do commit publicado.

Para concluir essa melhoria, crie o arquivo abaixo pela interface do GitHub ou forneça uma credencial com permissão de workflow. O conteúdo está preservado na ramificação local `seguranca-versao-completa-cc59c30` e deve executar três comandos: `pnpm typecheck`, `pnpm test` e `pnpm build` em cada push ou pull request para `main`.

## Pendências que dependem de definições operacionais

| Tema | Informação que a gestão deve definir | Implementação já preparada |
|---|---|---|
| Lotes de pré-venda | Sinal, quantidade mínima e política de estorno. | Variações, lotes e reserva de estoque. |
| Mercado Pago POS | Dispositivo, escopo da conta e credenciais. | Fluxo online separado e bloqueio comercial. |
| Automações por setor | Três regras prioritárias de cada diretoria. | Regras auditáveis e fila de e-mail. |
| Visões de tabelas | As três primeiras tabelas de cada setor. | Base tabular, permissões, auditoria e lixeira. |
