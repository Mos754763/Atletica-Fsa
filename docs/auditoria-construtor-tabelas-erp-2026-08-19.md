# Auditoria do Construtor de Tabelas do ERP

**Data:** 19 de agosto de 2026  
**Escopo:** Persistência, operações, permissões, visualização e limites do módulo `/admin/tabelas`.

## Evidência de acesso e visualização

O acesso foi verificado com a sessão administrativa da Presidência pela navegação interna do ERP. A rota carregou o módulo **Construtor / Nível B** e apresentou uma tabela existente, `Fornecedores`, vinculada a `Suprimentos`, com três campos: `Nome` (texto obrigatório), `Produto Oferecido` (múltipla seleção) e `Ativo` (seleção única obrigatória).

A página exibiu corretamente o resumo de **1 tabela visível** e **0 registros ativos**, os formulários de criação de tabela, campo, visão e registro, a lista de estruturas, os campos configurados e o atalho para a lixeira. Não havia registros ativos durante a inspeção visual; nenhum dado foi inserido, editado ou excluído nesta auditoria.

## Persistência confirmada por implementação

O módulo persiste metadados em `custom_tables`, campos em `custom_table_fields`, registros em `custom_table_records` (coluna `data_json` em JSONB) e visões em `custom_table_views`. As ações de criação chamam `insert` pelo servidor e revalidam a rota. Atualizações de registros usadas para lixeira e restauração atualizam `deleted_at`, `deleted_by` e `updated_by`; todas essas operações são persistidas e auditadas por triggers.

## Conclusão parcial importante

O módulo **não disponibiliza CRUD completo na interface**: não há ação de edição de tabela, campo ou registro, tampouco exclusão de tabela, campo ou visão. A única exclusão exposta é a exclusão lógica de registros, com restauração pela lixeira. Essa limitação deve ser comunicada antes de usar o Construtor como cadastro operacional de grande volume.

## Persistência e permissões

| Operação | Persistência | Evidência | Situação prática |
|---|---|---|---|
| Criar tabela | `INSERT` em `custom_tables` | Ação do servidor valida setor, nome, slug e objetivo; a tabela `Fornecedores` existe em produção | Disponível |
| Criar campo | `INSERT` em `custom_table_fields` | Ação do servidor valida o tipo e mantém ordem de exibição | Disponível |
| Criar registro | `INSERT` em `custom_table_records.data_json` | Normalização no servidor e trigger PostgreSQL validam obrigatoriedade e tipo | Disponível |
| Atualizar registro | Não há ação nem interface de edição | O banco suporta `UPDATE`, mas o ERP não expõe esse fluxo | Não disponível na interface |
| Excluir registro | `UPDATE` com `deleted_at` e `deleted_by` | Exclusão lógica; o registro é movido para lixeira | Disponível |
| Restaurar registro | `UPDATE` anulando campos de lixeira | Registro volta à lista ativa | Disponível |
| Editar/excluir tabela, campo ou visão | Não há ação correspondente | Não há controle visível na tela nem servidor para essas operações | Não disponível na interface |

Os gatilhos registram inserções e atualizações em `audit_logs`, inclusive a movimentação para lixeira e a restauração. O acesso é protegido por `requireAdminShell`, RLS e permissões setoriais: a Presidência tem acesso integral; diretores atuam no próprio setor; concessões explícitas podem liberar `ver`, `criar`, `editar` ou `apagar` por tabela dentro do setor. O log de auditoria é visível apenas para a Presidência.

## Limites identificados

| Aspecto | Regra aplicada | Lacuna ou consequência |
|---|---|---|
| Nome de tabela e campo | 2 a 80 caracteres na ação do servidor | Limite não aparece de forma explícita na interface |
| Slug técnico | Até 80 caracteres | Deve ser único por setor (tabela) ou por tabela (campo) |
| Objetivo da tabela | Até 300 caracteres | Sem contador visual |
| Lista de opções | Texto de configuração até 800 caracteres | Não há contador nem limite individual por opção |
| Tipos de registro | Texto, número, data, seleções, pessoa e caixa de seleção | `pessoa` é texto livre; data e opção selecionada não são semanticamente validadas no banco |
| Obrigatoriedade e tipo | Validados no servidor e em trigger PostgreSQL | A trigger não impõe tamanho de textos, intervalos numéricos, unicidade de valores ou pertença a opções de seleção |
| Número de tabelas, campos, visões e registros | Nenhum limite de negócio definido | Sem paginação, filtro, ordenação configurável ou virtualização; volumes altos degradarão a tela |
| Visões | Metadados para tabela, kanban, calendário e galeria são salvos | Apenas a exibição tabular está implementada; os outros formatos estão marcados como “em breve” |

## Evidência atual de produção

Uma consulta agregada, sem leitura dos dados dos registros, retornou **1 tabela ativa**, **3 campos ativos**, **0 registros ativos**, **0 visões salvas** e **4 eventos de auditoria** relacionados ao Construtor. A tabela ativa é `Fornecedores`, no setor `Suprimentos`, e também não possui registros na lixeira.

## Cobertura e escopo da verificação

A suíte automatizada passou com **139 testes aprovados** e **3 ignorados intencionalmente**; os testes específicos do Construtor cobrem normalização de tipos, obrigatoriedade e campo numérico opcional. A implementação e o banco confirmam as rotas de persistência descritas acima. Não foi criado um registro sintético no cadastro `Fornecedores` nesta auditoria para evitar contaminar a operação de produção; portanto, a confirmação visual ponta a ponta de criar, levar à lixeira e restaurar um registro permanece recomendada em uma tabela de homologação dedicada.

## Roteiro manual recomendado

1. Criar uma tabela de teste em homologação para um setor autorizado, com um campo obrigatório de texto, um número opcional, uma seleção e uma caixa de seleção.
2. Inserir um registro, atualizar cada valor depois que a edição for implementada, movê-lo para a lixeira e restaurá-lo.
3. Consultar `audit_logs` como Presidência e confirmar ator, data, entidade, ação e os estados anterior/posterior.
4. Testar a mesma URL com usuário sem concessão, com concessão apenas de leitura e com diretor do setor, confirmando o bloqueio ou a capacidade prevista.
5. Após a validação, remover ou arquivar a tabela de teste segundo uma política de retenção aprovada.
