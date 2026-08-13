# Deploy na Vercel — ATLETICA FSA

Este projeto está pronto para ser importado do repositório `Mos754763/Atletica-Fsa` como uma aplicação **Next.js**. A Vercel detecta o framework automaticamente; mantenha o *Root Directory* no diretório raiz do repositório e use os comandos padrão `pnpm install` e `pnpm build`.

## Variáveis de ambiente na Vercel

Cadastre as variáveis abaixo para os ambientes **Production**, **Preview** e **Development** quando aplicável. Os valores secretos não devem ser colocados no GitHub.

| Variável | Destino | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Navegador e servidor | URL do projeto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Navegador e servidor | Chave pública do Supabase. |
| `SUPABASE_SECRET_KEY` | Somente servidor | Necessária para operações administrativas, checkout, ODS, arquivos e automações. |
| `RESEND_API_KEY` | Somente servidor | Chave privada para e-mails transacionais. |
| `EMAIL_FROM` | Somente servidor | Remetente já verificado no Resend, por exemplo `ATLETICA FSA <contato@seudominio.com>`. |
| `NEXT_PUBLIC_APP_URL` | Navegador e servidor | A URL HTTPS final atribuída pela Vercel, sem barra final. |
| `MERCADO_PAGO_ACCESS_TOKEN` | Somente servidor | Access token de produção do Mercado Pago. |
| `MERCADO_PAGO_WEBHOOK_SECRET` | Somente servidor | Assinatura secreta configurada no webhook Mercado Pago. |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | Navegador | Reservada para componentes Mercado Pago que possam ser adicionados posteriormente. |
| `CRON_SECRET` | Somente servidor | Segredo aleatório longo usado pela Vercel Cron. |

> Nunca adicione `SUPABASE_DB_URL` na Vercel. Ela é exclusiva para executar migrações de forma local ou pelo painel do Supabase.

## Configurações após o primeiro deploy

Depois da Vercel informar o domínio final, substitua os marcadores abaixo por ele.

| Serviço | Configuração necessária |
| --- | --- |
| Supabase → Authentication → URL Configuration | Atualize **Site URL** para `https://SEU-DOMINIO.vercel.app` e adicione `https://SEU-DOMINIO.vercel.app/auth/callback` em **Redirect URLs**. Mantenha a URL de desenvolvimento local. |
| Mercado Pago → Webhooks | Cadastre `https://SEU-DOMINIO.vercel.app/api/payments/mercado-pago/webhook` para notificações de pagamento e configure o valor de assinatura em `MERCADO_PAGO_WEBHOOK_SECRET`. |
| Resend | Verifique o domínio de envio e use-o em `EMAIL_FROM`. Até isso ser feito, o remetente de testes possui restrições do provedor. |
| Vercel → Cron Jobs | O arquivo `vercel.json` agenda o lembrete diário às `13:00 UTC` (10h em GMT-3). A Vercel invoca a rota com `CRON_SECRET`. |

## Primeiro administrador

O primeiro login usando `moises.754763@graduacao.fsa.br` criará automaticamente um perfil de cliente. Após esse login, abra o **SQL Editor** do Supabase e execute a promoção abaixo uma única vez:

```sql
update public.profiles
set role = 'admin'
where lower(email) = 'moises.754763@graduacao.fsa.br';
```

Com isso, o acesso a `/admin`, `/admin/catalogo`, `/admin/eventos` e `/admin/relatorios` será liberado. A administração poderá promover os demais usuários por SQL até a tela de gestão de usuários ser ativada.

## Mercado Pago POS / maquininha presencial

O fluxo online usa Checkout Pro e atualiza pedidos pelo webhook validado. A conciliação da maquininha presencial exige o identificador do dispositivo/caixa POS e o escopo de integração da conta Mercado Pago. Antes de habilitá-la em produção, configure os dados da maquininha no painel Mercado Pago e use o mesmo webhook de pagamentos para centralizar os eventos confirmados.

O catálogo, eventos, ODS e pagamentos de checkout já compartilham as mesmas entidades de pedido e pagamento no Supabase. Dessa forma, a inclusão do terminal POS não altera o modelo de dados nem quebra a operação atual.

## Testes executados

Antes da entrega, foram executados `pnpm typecheck`, `pnpm test` e `NODE_ENV=production pnpm build`. A suíte contém testes das regras de papel, máquina de estados de eventos e pedidos, validação de imagem e assinatura de webhook Mercado Pago.
