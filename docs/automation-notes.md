# Automações transacionais e lembretes

Os e-mails de alteração de status serão disparados de forma síncrona, mas tolerante a falhas, pelos handlers de pagamento e operação. Cada envio será registrado em `email_deliveries`, usando uma chave de template para impedir duplicidade.

Os lembretes de evento serão executados uma vez ao dia por uma Vercel Cron Job, protegida pela variável privada `CRON_SECRET`. A agenda do arquivo `vercel.json` usa cron de cinco campos e é interpretada em UTC. Para atingir 10h no fuso GMT-3, o agendamento diário será configurado para `0 13 * * *`.

## Referências

1. [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
2. [Gerenciar Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
