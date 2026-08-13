# ATLETICA FSA

Plataforma integrada da ATLETICA FSA: landing page, loja online, catálogo/CMS, pedidos mobile, ODS, eventos, backoffice e automações de e-mail.

## Stack

O projeto usa **Next.js**, **TypeScript** e **Supabase** (PostgreSQL, Auth e Storage), com integrações server-side para **Resend** e **Mercado Pago**. A arquitetura é compatível com deploy na Vercel.

## Primeiros passos

1. Copie `.env.example` para `.env.local` e preencha as variáveis da sua conta.
2. Execute `pnpm install`.
3. Execute `pnpm dev` e abra `http://localhost:3000`.

> Nunca inclua valores reais de `.env.local` no Git. A chave secreta do Supabase, a chave Resend e tokens do Mercado Pago permanecem somente no servidor.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/app` | Páginas e handlers server-side do Next.js |
| `src/components` | Componentes de interface reutilizáveis |
| `src/lib/supabase` | Clientes Supabase para navegador e servidor |
| `src/types` | Tipos compartilhados do domínio FSA |
| `supabase/migrations` | Migrações SQL versionadas |

## Ambientes

O repositório é desenvolvido para o banco Supabase e publicação na Vercel. Os webhooks do Mercado Pago e as automações transacionais do Resend devem ser configurados na Vercel após o primeiro deploy público.
