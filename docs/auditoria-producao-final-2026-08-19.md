# Auditoria final de produção — ATLETICA FSA

**Data:** 19 de agosto de 2026  
**Escopo:** disponibilidade pública, autenticação de rotas, esquema Supabase, controles de abuso, integração/cron, CI/CD, dependências e runtime.  
**Método:** verificações de leitura e solicitações sem mutação. Não foram alterados preços, estoque, pedidos, pagamentos, cadastros operacionais ou o gate `PAYMENTS_ENABLED`.

## Parecer executivo

A versão de produção está disponível e respondeu corretamente às verificações realizadas. A auditoria também identificou dependências vulneráveis no conjunto de produção; a correção foi implementada, testada e publicada no commit `fa6402b06468c9a271862d4f3b1576165647cd90`.

| Área | Evidência | Resultado |
|---|---|---|
| Deployment | Vercel `dpl_2YiBENCMaZYCkxdw7pALQxJJtmpk` | `READY` e associada a `atleticafsa.site` |
| Landing, loja e eventos | `GET /`, `GET /loja`, `GET /eventos` | HTTP `200` |
| Rotas internas | `GET /erp`, `GET /admin/membros` sem sessão | HTTP `307` para `/login` |
| Exportação administrativa | `GET /api/admin/export` sem sessão | HTTP `401` |
| Runtime | Consulta Vercel das rotas críticas na janela de 1 hora | Nenhum erro agrupado |
| CI/CD | Execução de CI do commit `fa6402b` | `success` |
| Dependências de produção | `pnpm audit --prod` | 0 vulnerabilidades: 0 crítica, 0 alta, 0 moderada |
| Regressão e build | `pnpm test` e `pnpm build` | 145 testes aprovados, 3 ignorados; build concluído |

## Correções efetivadas

1. A aplicação foi atualizada de **Next.js 15.5.23** para **Next.js 16.3.1**, uma linha atualmente mantida e compatível com Node.js 20.9 ou superior. A instalação congelada do `pnpm` foi validada depois da atualização.
2. A dependência `xlsx` (SheetJS) foi removida. A rota `GET /api/admin/export` passou a gerar arquivos XLSX em OOXML de forma determinística, preservando os formatos CSV, XLSX e PDF e o contrato HTTP já coberto pelos testes.
3. Um teste de regressão de dependências foi adicionado para impedir o retorno de SheetJS e exigir os patches seguros diretos de `postcss` e `sharp`.
4. A promoção anterior da proteção de abuso foi revisada: tabelas, RLS e RPCs relevantes permanecem presentes em produção. O formulário continua limitado a 10 tentativas por IP/hora, com telemetria minimizada e retenção programada.

## Controles revisados

| Controle | Estado verificado |
|---|---|
| Login e RBAC | Rotas internas desviam usuários sem sessão para autenticação; dados administrativos não são expostos pela rota de exportação sem credencial. |
| Webhook Mercado Pago | O código revisado exige a assinatura aplicável, usa idempotência e preserva o gate de pagamentos. Nenhuma chamada de pagamento foi disparada nesta auditoria. |
| Cadastro de interesse | Validações combinadas, honeypot, hash de IP, limite atômico e painel de Presidência já foram promovidos com evidências de homologação. |
| Supabase | As tabelas de telemetria estão sob RLS e as RPCs administrativas permanecem protegidas por papel. |
| Observabilidade | A rota de saúde cobre os cron jobs versionados, incluindo a retenção do cadastro de interesse. |

## Limites e riscos residuais

Esta é uma auditoria operacional e de regressão, não um teste de invasão nem uma certificação jurídica. O disparo manual autenticado do cron diário de retenção não foi executado porque o segredo de cron não é exposto no ambiente de auditoria; a rota e sua proteção foram revisadas, e a execução deverá ser confirmada pelo próximo agendamento da Vercel.

Também permanece recomendado cadastrar `MEMBER_INTEREST_ABUSE_HASH_SECRET` como segredo próprio nos escopos **Production** e **Preview**. Enquanto isso, o mecanismo continua funcionando com o fallback já configurado em `CRON_SECRET`; a troca apenas isola melhor os dois controles.

Os termos e a política de retenção LGPD disponíveis no repositório ainda devem passar por revisão jurídica antes de serem publicados como instrumento formal.
