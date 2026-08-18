# Prontidão para liquidação sandbox — Mercado Pago

**Data:** 17 de agosto de 2026  
**Ambiente-alvo:** Preview da ATLETICA FSA + Supabase `atletica-fsa-homolog`  
**Escopo:** Preparação controlada para liquidação end-to-end de pagamento aprovado, sem uso de dados ou credenciais de Production.

## Evidência de acesso e isolamento

O painel autenticado do Mercado Pago exibiu a página de **Credenciais de teste** da aplicação usada para homologação, incluindo uma identidade vendedora de teste vinculada. Nenhuma chave, senha, código de verificação ou identificador sensível foi copiado para esta evidência, para o repositório ou para o código-fonte.

| Controle | Estado confirmado |
|---|---|
| Ambiente de dados | O teste será restrito ao projeto Supabase de homologação. |
| Checkout | A preferência deve ser criada pelo Preview com token de teste já configurado somente para Preview. |
| Produção | `PAYMENTS_ENABLED=false` permanece obrigatório e inalterado. |
| Webhook | A URL de Preview deve receber apenas a notificação assinada da compra sandbox. |
| Identidades | A conta vendedora de teste cria a preferência; a conta compradora de teste aprova a transação. |

## Estado do deployment e origem

Em 18 de agosto de 2026, o painel Vercel confirmou que a origem de Production está associada a `atleticafsa.site` e `www.atleticafsa.site`, com status **Ready** para o commit `9c06672`. A atualização da branch `sincronizacao-sem-ci` criou o Preview isolado `https://atletica-hxggfliv0-moises-faustino-rodrigues-s-projects.vercel.app/` para o commit `ddded5c`. A compilação concluiu com status **Ready** em 1 minuto e 15 segundos. Esse Preview, e não o domínio de Production, será usado para o pagamento sandbox aprovado.

O produto de rastreio **“Produto de teste — liquidação Mercado Pago”**, com valor exibido de **R$ 10,00**, foi localizado na categoria “Homologação Mercado Pago” da rota `https://atletica-hxggfliv0-moises-faustino-rodrigues-s-projects.vercel.app/loja`. Isso confirma que a atualização dinâmica da vitrine passou a refletir a massa exclusiva de homologação.

Na primeira tentativa controlada de iniciar o checkout, a tela exibiu `Configuração pública do Supabase ausente`. A rota de diagnóstico do próprio Preview, porém, retornou configuração pública válida da homologação. O diagnóstico identificou uma divergência no cliente da loja: a jornada de checkout usava somente a configuração compilada no bundle, enquanto o cliente já possui um fallback seguro para obter a configuração pública da rota `api/public-config` sem expor segredos. A correção usa esse fallback assíncrono, foi validada com typecheck e suíte local, e precisa de novo Preview antes de repetir a criação do pedido.

O commit `6cd1fe6` (`fix: resolve preview supabase config at checkout`) foi enviado à branch de homologação e gerou o Preview `https://atletica-lr57d3yqd-moises-faustino-rodrigues-s-projects.vercel.app/`. Na última inspeção, o deployment estava em **Building**; a tentativa de checkout só será repetida quando esse Preview ficar **Ready**.

O novo Preview concluiu a compilação e a loja carregou o catálogo de homologação, incluindo o produto de teste de R$ 10,00 disponível para adição ao carrinho. A repetição do checkout seguirá a mesma confirmação anterior, mantendo a unidade, a reserva e a transação restritas ao sandbox.

Na rota `/loja` do novo Preview, o filtro “Homologação Mercado Pago” isolou corretamente o produto de teste e confirmou que o carrinho estava vazio antes da nova tentativa. Nenhuma nova reserva, pedido ou cobrança foi criada durante essa verificação de vitrine.

O detalhe do produto foi aberto e exatamente uma unidade foi adicionada ao carrinho. O total confirmado é R$ 10,00, com retirada selecionada; ainda não havia pedido, reserva ou chamada ao Mercado Pago neste ponto.

Após a criação de pedido ser bloqueada pela autenticação, a sessão da conta administrativa exclusiva de homologação foi iniciada com sucesso no novo Preview. A área “Minha conta” reconheceu o papel administrativo e o retorno à loja manteve o catálogo de homologação isolado; o carrinho foi reiniciado como esperado, sem pedido ou reserva persistente da tentativa anterior.

Na sessão autenticada, o filtro de homologação e o modal de detalhes continuaram disponíveis, confirmando que o produto de teste permaneceu ativo e com valor de R$ 10,00 antes de adicionar a unidade ao novo carrinho.

Uma unidade foi adicionada ao carrinho autenticado, com retirada e total de R$ 10,00. A ação autorizada “Reservar estoque e pagar” foi submetida e o botão entrou no estado “Abrindo Mercado Pago...”; a evidência de pedido, reserva e redirecionamento será confirmada somente após a resposta de checkout.

O pedido foi aceito pelo Preview e redirecionou ao Checkout Pro do Mercado Pago com o produto de teste e valor de R$ 10,00. Como o navegador apresentou uma carteira/cartão já salvo na sessão atual, nenhuma informação de cartão foi preenchida e nenhum clique em “Pagar” foi realizado. A conclusão permanece bloqueada até que a conta compradora de teste seja confirmada no Checkout, evitando qualquer risco de uso de uma forma de pagamento não destinada à homologação.

No painel de Webhooks do Mercado Pago, o modo de teste estava inicialmente apontado para a origem pública `https://atletica-fsa.vercel.app/api/payments/mercado-pago/webhook`. Com autorização explícita, o campo foi alterado para o endpoint do Preview isolado `https://atletica-lr57d3yqd-moises-faustino-rodrigues-s-projects.vercel.app/api/payments/mercado-pago/webhook`. A aba de Production não foi aberta nem modificada. A persistência da alteração ainda requer confirmação explícita do painel antes de qualquer nova simulação, e a URL pública deve ser restaurada ao encerrar o ensaio.

O painel confirmou o salvamento da configuração com a mensagem `Pronto! Salvamos os dados da sua configuração com sucesso.`. A URL de teste exibida passou a ser o endpoint isolado do Preview; a área de Production não foi modificada. A restauração da URL originalmente configurada para a origem pública continua obrigatória depois da evidência final.

Na Vercel, a proteção `Require Log In` permanece ativa para os deployments. A página de proteção confirmou que não há segredo de bypass ativo e exibe a ação `Add Secret`. O único mecanismo temporário previsto para o ensaio é um segredo de automação por header ou query parameter; a proteção de visitantes e as exceções de Production não serão alteradas.

Com autorização explícita, foi criado um bypass de automação temporário identificado no painel como `Homologação Mercado Pago sandbox — revogar após evidência`. O painel confirmou `Automation Bypass added`; o valor permanece mascarado, não foi registrado nesta evidência e deverá ser revogado imediatamente após a validação da liquidação e do replay idempotente.

O Preview isolado foi acessado com sucesso após a criação do bypass e exibiu a vitrine de homologação, incluindo o produto rastreável de R$ 10,00. A tela de login da aplicação também ficou acessível nessa mesma origem. Nenhuma URL de Production, sessão de Production ou credencial real foi usada nessa validação.

## Consulta pós-Checkout — 18 de agosto de 2026

Uma consulta somente-leitura ao projeto `gfnbdjdqumewspvfxicl`, feita após a navegação ao Checkout Pro sandbox, mostrou que as duas ordens de R$ 10,00 permaneciam com status `aguardando_pagamento` e sem `paid_at`. A tabela `payments` não continha registros e `payment_webhook_events` não possuía novo evento de pagamento. Portanto, o ensaio comprovou a criação da preferência e a chegada ao Checkout Pro, mas **não comprovou liquidação aprovada**.

Nenhuma cobrança de Production foi realizada. A liquidação ponta a ponta continuará pendente até que a conta compradora de teste confirme a forma de pagamento sandbox e, depois disso, sejam observados `orders.paid_at`, uma linha de `payments` e o evento correspondente em `payment_webhook_events`.

Após o encerramento desta rodada, o painel da Vercel confirmou a mensagem `Automation Bypass removed` e voltou a exibir somente a ação `Add Secret`. Portanto, nenhum bypass temporário permanece ativo. A confirmação do usuário de que a transação foi considerada concluída para fins de navegação foi preservada como decisão operacional, mas não altera a evidência técnica de banco: até uma nova aprovação sandbox verificável, esta rodada deve ser classificada como **checkout criado, não liquidado**.

Com confirmação explícita, a configuração de **Modo de teste** do Mercado Pago foi restaurada para `https://atletica-fsa.vercel.app/api/payments/mercado-pago/webhook`. O painel exibiu a confirmação `Pronto! Salvamos os dados da sua configuração com sucesso.`; nenhuma configuração do **Modo de produção** foi aberta ou modificada nessa restauração.

## Próxima sequência operacional

1. Em uma nova sessão isolada da conta compradora de teste, apontar temporariamente a URL de teste ao Preview de homologação e criar somente o bypass estritamente necessário.
2. Abrir o Checkout Pro a partir do Preview autenticado, concluir uma compra sandbox aprovada e registrar o identificador sem expor dados sensíveis.
3. Consultar no banco de homologação o pedido, pagamento, evento de webhook e único movimento de estoque.
4. Repetir a mesma notificação para comprovar que não surgem pagamento, baixa ou e-mail duplicados.
5. Restaurar a URL de teste pública e revogar o bypass temporário; registrar os resultados sem dados pessoais ou segredos.
