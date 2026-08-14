# Fontes técnicas — RLS e concorrência

Este registro preserva as referências externas consultadas para a revisão de permissões granulares e operações atômicas de retirada.

| Fonte | Aplicação no projeto |
|---|---|
| [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) | RLS deve permanecer habilitada em tabelas expostas; as políticas devem combinar identidade autenticada e `USING`/`WITH CHECK` para cada operação. |
| [PostgreSQL — Explicit Locking](https://www.postgresql.org/docs/current/explicit-locking.html) | `SELECT ... FOR UPDATE` bloqueia modificações/locks concorrentes sobre a mesma linha até o término da transação. |
| [PostgreSQL — SELECT](https://www.postgresql.org/docs/current/sql-select.html) | A sintaxe `FOR UPDATE` é o mecanismo de bloqueio de linha aplicável às funções de retirada e check-in. |
