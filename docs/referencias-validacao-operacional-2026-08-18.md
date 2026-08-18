# Referências de validação operacional — 18/08/2026

## Resend e domínio remetente

A documentação do Resend informa que o envio por domínio próprio exige ao menos um domínio verificado. Após a verificação, é possível usar endereços do domínio como remetente; DMARC e BIMI são recomendações adicionais para aumentar a confiança e a entrega na caixa de entrada. O Resend também recomenda subdomínios para separar a reputação de tipos distintos de envio.

Fonte: [Resend — Verified Domains](https://resend.com/docs/dashboard/domains/introduction).

## SMTP do Supabase Auth

A documentação do Supabase recomenda SMTP customizado em produção para fluxos de confirmação, convite, recuperação de senha e contas por e-mail. Ela indica configurar host, porta, usuário, senha e remetente, além de manter SPF, DKIM e DMARC no domínio de envio.

Fonte: [Supabase — Send emails with custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

## Cron da Vercel

Os cron jobs da Vercel chamam endpoints da implantação de Production por HTTP GET seguindo as entradas de `vercel.json`; as expressões possuem cinco campos e usam UTC. A documentação também recomenda tratar erro, concorrência e execução do cron como preocupações operacionais explícitas.

Fonte: [Vercel — Cron Jobs](https://vercel.com/docs/cron-jobs).
