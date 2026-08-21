# Especificação de transição técnica: Backoffice

**Data:** 21 de agosto de 2026  
**Escopo:** Substituir o valor técnico `cozinha` por `backoffice` no RBAC cumulativo da ATLETICA FSA.

## Objetivo

O papel operacional de Backoffice passará a usar `backoffice` como único identificador técnico no enum `public.user_role`, na tabela `public.profile_role_assignments`, na coluna legada `public.profiles.role`, nos helpers de autorização, nas RPCs operacionais e na aplicação Next.js. A mudança preserva todas as atribuições existentes, incluindo conjuntos cumulativos.

## Estratégia de dados e compatibilidade

| Elemento | Tratamento |
|---|---|
| Enum `public.user_role` | `ALTER TYPE ... RENAME VALUE 'cozinha' TO 'backoffice'`; o OID do valor é preservado e colunas existentes são atualizadas sem recriar linhas. |
| Atribuições existentes | Linhas existentes em `profile_role_assignments` passam a representar `backoffice` automaticamente pelo rename do enum. |
| Papel primário legado | `profiles.role` permanece sincronizado pelo gatilho existente, agora com a prioridade `admin`, `caixa`, `backoffice`, `cliente`. |
| Funções e RLS | Todas as funções que continham o literal antigo são recriadas no mesmo bloco transacional. As RPCs operacionais passam a usar `has_any_role(...)`, evitando regressão para papel primário único. |
| Aplicação | Tipos, schemas, guards, APIs, menus, dashboard, conta e estilos passam a usar somente `backoffice`. |

> O PostgreSQL armazena o texto-fonte de corpos PL/pgSQL. Por isso, renomear somente o enum não é suficiente: uma função antiga que ainda contivesse o literal `cozinha` poderia falhar quando recompilada. A migração recria explicitamente todas as funções operacionais afetadas no mesmo `BEGIN/COMMIT`.

## Critérios de aceite

1. Nenhum valor técnico `cozinha` permanece em código de execução, migrations futuras, testes ativos ou documentação operacional vigente.
2. Usuários antes atribuídos a `cozinha` passam a ter `backoffice` sem perda de acesso ao ODS e à operação de pedidos.
3. A combinação `cliente + caixa + backoffice` tem a união de ODS, pedidos e relatórios, mas não recebe Catálogo, Eventos administrativos, Membros ou Exportações administrativas.
4. A Presidência consegue atribuir e remover `backoffice` em conjunto com outros papéis e a invariável do último administrador permanece protegida.
5. Homologação é validada antes da execução em Production; as duas aplicações usam o mesmo SQL transacional versionado.

## Rollback

Antes do `COMMIT`, qualquer erro desfaz o bloco inteiro. Após uma execução bem-sucedida, a reversão exige uma nova migração coordenada de `backoffice` para `cozinha`; ela não deve ser feita manualmente em tabelas isoladas, pois enum, funções, RLS e código precisam permanecer alinhados.
