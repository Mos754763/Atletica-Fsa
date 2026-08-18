# Investigação da inscrição gratuita em homologação

**Ambiente analisado:** preview da branch `sincronizacao-sem-ci`, deployment `dpl_2v12mQ3JBX9gwsCYj5N5utS28Ksx`, URL `https://atletica-5k6vuvt6n-moises-faustino-rodrigues-s-projects.vercel.app`.

## Evidências coletadas

| Verificação | Resultado | Evidência |
|---|---|---|
| Origem Supabase do preview | Homologação | `GET /api/public-config` retornou `https://gfnbdjdqumewspvfxicl.supabase.co`. |
| Evento público | Existe e está publicado | A página `/eventos` exibiu **HML — Ingresso gratuito 2026-08-18**, com status `INSCRIÇÕES ABERTAS`, preço gratuito e data em 19/08/2026 10:00. |
| Tentativa de inscrição | Falhou de forma controlada | A ação retornou `303` para `/eventos?inscricao=erro` às 13:47:16 GMT-3, sem erro 5xx. |
| Contexto de execução | Preview isolado | Log da Vercel: ambiente `preview`, branch `sincronizacao-sem-ci`, rota `/eventos`, duração de função de 1,17s. |
| Configuração pública | Correta | A chave pública e a URL expostas pelo endpoint correspondem ao projeto `gfnbdjdqumewspvfxicl`. |
| Logs da Vercel | Sem exceção de aplicação | O detalhe do POST não apresentou mensagens de console, warnings, errors ou fatal; a ação captura o erro da RPC e redireciona genericamente. |
| Editor SQL de homologação | Bloqueado por defeito de interface | Em nova tentativa, uma consulta `SELECT` somente leitura foi visivelmente inserida e o botão **Run** foi acionado; o painel voltou a mostrar `0 rows` e `Error: query: Too small: expected string to have >=1 characters`. |

## Diagnóstico atual

A configuração do preview está apontando corretamente para a homologação. O retorno genérico é produzido no ramo `if (error || !registration)` de `registerForEvent`, em `src/app/eventos/actions.ts`. Como o formulário do evento não exibe lotes, a RPC é acionada com `p_ticket_lot_id = null`; portanto, o lote não é a causa direta desta tentativa.

> O editor SQL do painel de homologação apresentou o erro de interface `query: Too small: expected string to have >=1 characters`, inclusive com texto visível no editor. A consulta REST anônima também não é suficiente para confirmar registros administrativos, pois as políticas RLS podem ocultá-los. A próxima etapa deve obter o código PostgreSQL da RPC com credencial administrativa de homologação ou acrescentar telemetria segura na ação para registrar o código e a mensagem do erro da RPC, sem expor dados pessoais ou segredos.

A reprodução posterior confirmou que a falha não era causada pelo caractere especial no título: a consulta agregada, inserida diretamente pelo teclado no editor, falhou com a mesma mensagem antes de produzir resultado. O editor não deve ser usado como fonte de verdade para este diagnóstico até o painel normalizar o estado interno da consulta.

## Correção e confirmação de emissão

Uma reprodução da RPC em transação explicitamente revertida identificou o erro real: **SQLSTATE `42804`**, pois a coluna `event_registrations.status` é do enum `registration_status`, enquanto o `CASE` da função retornava texto sem coerção explícita. A migração `20260818182000_fix_event_registration_enum.sql` passou a converter ambos os ramos para `public.registration_status` e foi aplicada **somente** no projeto de homologação.

Após a correção, a mesma chamada transacional terminou com `registration_call=success` e foi revertida. Em seguida, a inscrição real controlada pela agenda do Preview foi concluída: a aplicação redirecionou para `/conta/eventos?inscricao=confirmada`, exibiu o ingresso `HML — Ingresso gratuito 2026-08-18`, valor **R$ 0,00**, situação **CONFIRMADA** e um código de check-in. A próxima validação limitada é o primeiro check-in e a repetição idempotente do mesmo código.

## Check-in atômico e idempotência

No primeiro envio ao validador do Backoffice, a Vercel registrou HTTP 500 com **`column reference "registration_id" is ambiguous`**. A origem foi a RPC `check_in_event_ticket`: o nome da coluna de retorno `registration_id` concorria com a referência não qualificada de `event_tickets`. A migração `20260818190000_fix_checkin_registration_id_ambiguity.sql` qualificou a referência como `ticket.registration_id`, preservando os bloqueios `FOR UPDATE`, a transição de inscrição e o uso do ingresso.

A correção foi aplicada **somente** na homologação. O primeiro check-in pela interface passou a persistir `event_registrations.status = check_in_realizado` e `event_tickets.status = usado`. A repetição do mesmo código pela interface não produziu novo erro; a chamada complementar em transação revertida retornou `final_status = check_in_realizado` e `already_checked_in = true`. Assim, o ensaio controlado confirmou emissão gratuita, consumo único e comportamento idempotente sem alterar dados da produção.

## Limites preservados

Nenhuma operação foi executada contra o projeto Supabase de produção (`tbxihkzuyzszrfxqmleq`). Não houve alteração em `PAYMENTS_ENABLED` de produção nem ativação de bypass de proteção.
