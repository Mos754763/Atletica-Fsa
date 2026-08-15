# Verificação de Cron na Vercel

**Projeto:** ATLETICA FSA  
**Data da consulta:** 15 de agosto de 2026  
**Responsável:** Manus AI

## Evidência de publicação

O painel da Vercel identifica o projeto `atletica-fsa` como publicado a partir do commit `1eaff9e` — `fix: align Vercel cron schedule with Hobby limits`. O check associado no GitHub está concluído com sucesso e informa **“Vercel — Deployment has completed”**.

## Estado dos jobs

O painel **Settings → Cron Jobs** da Vercel informa que a funcionalidade está **Enabled**. A agenda efetivamente registrada no deployment de produção é:

| Rota | Expressão UTC | Próxima janela prevista | Finalidade |
| --- | --- | --- | --- |
| `/api/cron/event-reminders` | `0 13 * * *` | Diariamente, a partir de 13:00 UTC | Envio e processamento de lembretes de eventos. |
| `/api/cron/sympla-sync` | `0 14 * * *` | Diariamente, a partir de 14:00 UTC | Sincronização incremental dos eventos Sympla. |
| `/api/cron/integration-health` | `0 18 * * 1` | Segundas-feiras, a partir de 18:00 UTC | Medição de saúde, atraso e recuperação das integrações. |

No plano Hobby, cada job possui janela de execução flexível de até uma hora após o horário configurado. Portanto, para a sincronização Sympla, o registro de execução pode aparecer entre **14:00 e 15:00 UTC**.

## Logs consultados

Na consulta inicial do painel **Logs**, não havia novos registros no recorte de tempo selecionado. O painel mostrava **0 warnings**, **0 errors** e **0 fatals**. Isso é compatível com o deployment recém-publicado antes da primeira janela diária da nova agenda e não indica falha de cron.

Para comprovar a primeira execução automática, abra **Settings → Cron Jobs → View Logs** na linha `/api/cron/sympla-sync` após 15:00 UTC. Deve existir uma invocação da rota; o status HTTP `200` confirma a execução bem-sucedida, enquanto `401`, `503` ou `5xx` deve ser investigado no log da função e nos registros de integração do Supabase.

## Cobertura automatizada contra regressões

O teste `src/lib/integrations/vercel-cron-config.test.ts` importa o `vercel.json` real e exige igualdade estrutural de toda a matriz de Cron Jobs. Ele falha caso uma rota seja removida, tenha caminho alterado, ganhe uma expressão de frequência incompatível com Hobby ou tenha horário/modo semanal modificado sem revisão explícita do teste.

Em conjunto, os testes de saúde de integração validam o limite operacional de 26 horas para rotas diárias. Isso impede que uma mudança de agenda diária mantenha incorretamente o limiar anterior de 20 minutos e passe a classificar execuções normais como atrasadas.
