# Promoção controlada de homologação para produção

**Data:** 19 de agosto de 2026
**Escopo:** Cadastro público de interesse em integrar a ATLETICA FSA

## Resultado

O código homologado já estava presente no ramo `main` desde o merge `4b188ea`. A publicação produtiva vinculada ao commit `7912d7b` estava em estado `READY` na Vercel. A divergência estrutural restante entre os bancos era exclusivamente a ausência da tabela `public.member_interest_applications` e de seus controles associados em produção.

Foi aplicada em produção, com interrupção em caso de erro, a migração idempotente `20260819110000_member_interest_intake.sql`, anteriormente validada em homologação. A execução criou somente a estrutura abaixo:

| Recurso | Verificação pós-aplicação |
|---|---|
| `public.member_interest_applications` | Existe e permaneceu com **0 registros** |
| Índice por status e data | Criado pela migração |
| Trigger de `updated_at` | 1 trigger ativo |
| RLS | Habilitado |
| Políticas de Presidência | 2 políticas ativas para leitura e atualização |
| Grants para `authenticated` | Aplicados conforme a migração |

## Itens expressamente não alterados

Não foram inseridos, atualizados ou excluídos registros de produção. Também não foram alterados preços, estoque, produtos, pedidos, eventos, credenciais, domínios, integrações externas ou o gate `PAYMENTS_ENABLED`.

Durante o inventário foi observada em produção uma tabela preexistente denominada `public.table_name`, que não existe em homologação. Ela **não foi modificada** porque não faz parte da migração homologada e exige auditoria isolada antes de qualquer ação.

## Validação operacional

A landing [atleticafsa.site](https://atleticafsa.site/) respondeu normalmente após a promoção e exibiu o formulário de interesse. A consulta de erros recentes da Vercel retornou apenas o incidente histórico `PGRST205` do Preview de homologação, ocorrido antes da aplicação da tabela naquele ambiente; não foi atribuído erro ao deployment produtivo atual.

## Próxima verificação recomendada

O primeiro cadastro real pode ser acompanhado no ERP pela Presidência. Recomenda-se confirmar a versão de aceite LGPD exibida no formulário antes de divulgar a funcionalidade, após a revisão jurídica das minutas recém-incluídas.
