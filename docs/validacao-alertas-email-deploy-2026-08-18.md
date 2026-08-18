# Validação de alerta, e-mail e deploy — 18/08/2026

## Escopo e salvaguardas

Esta validação usou o ambiente de homologação e a caixa externa administrativa. Nenhuma compra, alteração de dados de Production ou consumo do token de recuperação foi realizado. O `PAYMENTS_ENABLED` de Production permaneceu fora do escopo.

## Alerta Slack

Foi enviado um alerta controlado ao webhook Slack já configurado, com mensagem identificada como teste da ATLETICA FSA e sem ação operacional em Production. O endpoint respondeu **HTTP 200**, confirmando que o webhook aceita a entrega. A tentativa de executar o mesmo teste pelo fluxo administrativo do Preview foi bloqueada antes da sincronização porque a conta local de homologação não aceitou a senha disponível e o provedor Google está desabilitado nesse projeto Supabase (`Unsupported provider: provider is not enabled`).

## E-mail de recuperação

A caixa externa de `moises.754763@graduacao.fsa.br` recebeu a mensagem de recuperação às 13:28. A mensagem apresenta remetente **`noreply@atleticafsa.site`**, assunto **`Reset your password`** e o botão **`Reset password`**. O e-mail foi aberto somente para inspeção visual; o link não foi acionado, preservando o token de recuperação. A URL de destino não foi consumida nem exposta nesta evidência.

## Gatilho GitHub–Vercel

O conector Vercel foi habilitado e o vínculo GitHub do projeto `atletica-fsa` foi restaurado para `Mos754763/Atletica-Fsa`. O commit de ensaio `47792b558baac7bbcd9cafb376ff8a36d6c6948f`, na branch `sincronizacao-sem-ci`, criou automaticamente o Preview `dpl_5bwso9TWytKtAW97QHaB991gP2KS` com `source=git`, `githubDeployment=1` e estado final **READY**. Isso comprova o acionamento automático GitHub–Vercel para Preview.

## Limpeza concluída

A sobreposição temporária e inválida de `SYMPLA_API_TOKEN`, limitada ao Preview da branch `sincronizacao-sem-ci`, foi removida da Vercel com confirmação explícita. A credencial base, configurada em **Production and Preview**, permanece preservada. O redeploy manual oferecido pelo painel tinha como padrão o ambiente Production e foi cancelado; a aplicação da limpeza será feita pelo próximo Preview automático disparado pelo commit de documentação desta validação.
