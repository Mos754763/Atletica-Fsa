# Auditoria de paridade: homologação e Production

**Data:** 18 de agosto de 2026  
**Escopo:** levantamento somente leitura de código implantado, migrações e configurações. Nenhum dado ou configuração de Production foi modificado nesta etapa.

## Linha de base de deploy

| Ambiente | Commit ativo observado | Estado | Impacto |
| --- | --- | --- | --- |
| Production | `41525c9` — plano P0 e checklist Mercado Pago | Ready | Ainda não contém a correção de recuperação de senha do Preview. |
| Preview de homologação | `ced0f1f` — fluxo de recuperação de senha | Ready | Contém a tela `/redefinir-senha`; utiliza Supabase e Mercado Pago de homologação. |

Assim, os ambientes **não são idênticos no código implantado**. A promoção da correção de senha para Production exige merge controlado da branch `sincronizacao-sem-ci` em `main`, seguido de verificação de deploy, antes de qualquer teste no domínio canônico.

## Linha de base de variáveis da Vercel

| Grupo | Escopo observado | Interpretação operacional |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` | Production | Production possui configuração própria para o Supabase produtivo. |
| `PAYMENTS_ENABLED` | Preview e Production, em entradas distintas | O gate de pagamentos deve permanecer desabilitado em Production; o valor não foi aberto durante a auditoria. |
| Credenciais Mercado Pago e segredo de webhook | Entradas separadas por ambiente, com algumas variáveis compartilhadas em escopo | Exige conferência individual de escopo e valor mascarado antes de qualquer promoção; credencial sandbox não deve ser copiada para Production. |

## Regra de segurança aplicada

> Nenhuma tabela, usuário, pedido, pagamento, token, segredo ou variável foi copiado de homologação para Production. A promoção deverá ocorrer por código versionado, migrações idempotentes e configuração explícita por ambiente.

## Próxima leitura autorizada

O editor SQL oficial de Production foi aberto para uma consulta de catálogo e de histórico de migrações exclusivamente com `SELECT`. A consulta não terá `INSERT`, `UPDATE`, `DELETE`, DDL ou chamada de função de negócio.

## Resultado da paridade estrutural

Uma consulta autenticada e somente leitura comparou as tabelas e funções do schema `public` dos dois bancos. O resultado foi **88 objetos em Production e 88 em homologação**, sem objeto exclusivo em qualquer um dos lados. Portanto, a estrutura pública de domínio está alinhada, inclusive os dois reparos de RPC aplicados anteriormente.

O histórico de migrações não foi utilizado como fonte de verdade porque as migrações da aplicação não são registradas em uma tabela pública de controle do projeto. A comparação foi feita sobre a estrutura realmente exposta pelo banco.

## Configuração de autenticação de Production

| Campo | Estado observado |
| --- | --- |
| Site URL | `https://atleticafsa.site` |
| Callback canônico | `https://atleticafsa.site/auth/callback` autorizado |
| Callback Preview | Padrão restrito `https://atletica-*-moises-faustino-rodrigues-s-projects.vercel.app/auth/callback` autorizado |
| Callback legado | `https://atletica-fsa.vercel.app/auth/callback` ainda autorizado |

A configuração de Production está correta para o domínio canônico e não deve receber a Site URL de homologação. A eventual promoção do reset de senha será uma promoção de código para `main`, não uma cópia das URLs de autenticação de homologação.

## Provedores de autenticação

Production possui **Email** e **Google** habilitados. Em homologação, a investigação anterior confirmou Email habilitado e Google desabilitado. Portanto, o erro `provider is not enabled` reportado no Preview é específico de homologação e não deve motivar alteração imediata no provedor de Production.

## Diferença de código pendente de promoção

O Preview está no commit `ced0f1f`, derivado de `41525c9`, hoje em Production. A diferença é restrita a oito arquivos e adiciona o fluxo de recuperação: página `/redefinir-senha`, componente de nova senha, helper de callback e um teste unitário. Não altera banco, RLS, checkout, webhook, pedidos, estoque, Mercado Pago, segredos ou cron.

Assim, a única promoção de código necessária para disponibilizar o reset de senha em Production é o commit `ced0f1f` por meio de merge controlado para `main`. As alterações locais de documentação e checklist desta auditoria permanecem fora dessa promoção até serem revisadas e commitadas separadamente.

## Classificação de risco e decisão recomendada

| Área | Situação | Risco de promoção | Decisão recomendada |
| --- | --- | --- | --- |
| Estrutura pública do banco | 88 objetos equivalentes nos dois ambientes | Baixo | Não executar migração em Production. |
| Correções das RPCs de eventos | Já aplicadas e verificadas em Production | Alto se reaplicadas desnecessariamente | Não reaplicar. |
| Recuperação de senha | Implementada no commit `ced0f1f`, ausente de `main` | Baixo a moderado | Promover somente o commit de recuperação para `main`, após confirmação. |
| URLs de autenticação | Production aponta para o domínio canônico; homologação aponta para Preview | Alto se copiar a configuração de homologação | Preservar as URLs de Production. |
| Google OAuth | Ativo em Production e inativo em homologação | Moderado | Não alterar Production; decidir separadamente se a homologação deve receber um cliente OAuth próprio. |
| Mercado Pago | Homologação usa chaves sandbox; Production mantém `PAYMENTS_ENABLED=false` | Crítico | Não promover chaves sandbox e não habilitar pagamentos. |
| Dados operacionais | Eventos, pedidos e registros de teste existem em homologação | Crítico | Nunca copiar dados de teste para Production. |

O escopo seguro de mudança em Production é, portanto, **apenas a promoção do commit `ced0f1f`**. Essa alteração disponibiliza a interface e o callback de redefinição de senha no domínio canônico, sem gravar dados de negócio nem habilitar pagamentos.

## Execução aprovada da promoção

O administrador confirmou a promoção. O commit `ced0f1f67fbf75d70018c6084cd746fe675520da` foi enviado diretamente para `main`, avançando-a de `41525c9` sem force push. A suíte local correspondente foi concluída com **35 arquivos de teste aprovados, 1 ignorado intencionalmente, 113 testes aprovados e 3 ignorados intencionalmente**.

A Vercel recebeu o deployment de Production do commit `ced0f1f`; o Preview da mesma revisão já estava `Ready`. No momento deste registro, a execução de Production ainda estava em `Building`, e nenhum teste autenticado, pagamento, alteração de dados ou mudança de configuração de Production foi realizado.

Após a promoção, o domínio canônico `https://atleticafsa.site/login` respondeu normalmente e exibiu tanto a página de login quanto o modo **“Recupere seu acesso”**, com o campo de e-mail e o botão **“Enviar link de recuperação”**. A abertura desse modo foi validada sem disparar e-mail nem modificar credenciais. A URL de deployment `atletica-p6visoavo-…vercel.app` também serviu a landing page; o painel da Vercel ainda reportava a execução como `Building` durante a verificação, embora as rotas públicas já estivessem acessíveis.

Em seguida, o painel da Vercel confirmou o deployment de Production de `ced0f1f` como **Ready**, concluído em 47 segundos. Permaneceram inalterados: `PAYMENTS_ENABLED=false` em Production, os dados produtivos, as URLs canônicas de autenticação, a configuração do Google OAuth e as integrações financeiras.
