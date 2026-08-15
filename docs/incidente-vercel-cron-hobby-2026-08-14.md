# Incidente de Deploy Vercel — Limite de Cron no plano Hobby

**Data da identificação:** 14 de agosto de 2026  
**Commit afetado:** `a0e852f`  
**Check no GitHub:** `Vercel — Deployment failed`

## Evidência externa

O check de status do commit no GitHub aponta uma falha de deployment produzida pela integração Vercel. O histórico de GitHub Actions está vazio; portanto, não se trata de uma falha de workflow do GitHub Actions.

O link de detalhes do check direciona para a documentação da Vercel sobre limites de Cron. A documentação informa que contas no plano **Hobby** aceitam apenas tarefas agendadas com frequência máxima de uma vez ao dia; expressões que executam mais de uma vez ao dia fazem o deployment falhar. [1]

## Causa confirmada e correção aplicada

O projeto possuía três rotas cron; a sincronização Sympla estava configurada como `*/15 * * * *`, frequência incompatível com o plano Hobby. A configuração foi alterada para uma execução diária às 14:00 UTC. Os lembretes permanecem diariamente às 13:00 UTC e a verificação de saúde permanece semanal, movida para segunda-feira às 18:00 UTC para ocorrer após os jobs diários.

O limite de atraso do monitoramento da sincronização foi ajustado de 20 minutos para 26 horas e seus testes foram atualizados. Assim, a observabilidade corresponde à cadência efetivamente suportada, enquanto a execução manual de sincronização no painel administrativo continua disponível para necessidade imediata.

## Referência

[1]: https://vercel.com/docs/cron-jobs/usage-and-pricing "Vercel — Usage & Pricing for Cron Jobs"
