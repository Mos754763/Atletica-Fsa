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

## Diagnóstico atual

A configuração do preview está apontando corretamente para a homologação. O retorno genérico é produzido no ramo `if (error || !registration)` de `registerForEvent`, em `src/app/eventos/actions.ts`. Como o formulário do evento não exibe lotes, a RPC é acionada com `p_ticket_lot_id = null`; portanto, o lote não é a causa direta desta tentativa.

> O editor SQL do painel de homologação apresentou o erro de interface `query: Too small: expected string to have >=1 characters`, inclusive com texto visível no editor. A consulta REST anônima também não é suficiente para confirmar registros administrativos, pois as políticas RLS podem ocultá-los. A próxima etapa deve obter o código PostgreSQL da RPC com credencial administrativa de homologação ou acrescentar telemetria segura na ação para registrar o código e a mensagem do erro da RPC, sem expor dados pessoais ou segredos.

## Limites preservados

Nenhuma operação foi executada contra o projeto Supabase de produção (`tbxihkzuyzszrfxqmleq`). Não houve alteração em `PAYMENTS_ENABLED` de produção nem ativação de bypass de proteção.
