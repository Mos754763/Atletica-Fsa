# Configuração de autenticação — Supabase

## Estado validado em 13 de agosto de 2026

| Item | Estado |
| --- | --- |
| E-mail e senha | Habilitado com confirmação de e-mail |
| Google OAuth | Habilitado no painel Supabase |
| Callback do Google para Supabase | `https://tbxihkzuyzszrfxqmleq.supabase.co/auth/v1/callback` |
| Site URL atual | Precisa ser corrigida para `http://localhost:3000` |
| Redirect URLs adicionais | Ainda precisam ser cadastradas via o botão `Add URL` |

## URLs para cadastrar durante desenvolvimento

Adicione em **Authentication → URL Configuration → Redirect URLs**:

```text
http://localhost:3000/auth/callback
```

> **Importante:** a URL acima pertence à lista **Redirect URLs**, e não ao campo **Site URL**. Durante o desenvolvimento local, o campo Site URL deve permanecer como `http://localhost:3000`.

## Após o primeiro deploy na Vercel

Substitua a **Site URL** pelo domínio de produção e adicione:

```text
https://SEU_DOMINIO_VERCEL/auth/callback
```

Para ambientes de preview da Vercel, use a regra permitida pelo Supabase:

```text
https://*-Mos754763.vercel.app/auth/callback
```

> Não exponha o Client Secret do Google, a chave secreta do Supabase, a chave Resend ou a string de conexão PostgreSQL no repositório.
