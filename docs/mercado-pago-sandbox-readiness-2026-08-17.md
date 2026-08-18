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

## Próxima sequência operacional

1. Criar um perfil proprietário exclusivo em homologação e aplicar somente a migration de bootstrap ainda pendente.
2. Criar um produto de baixo valor, estoque unitário e pedido identificável exclusivamente no catálogo de homologação.
3. Abrir o Checkout Pro a partir do Preview autenticado como comprador de teste e concluir uma compra aprovada.
4. Aguardar ou reenviar de forma controlada a notificação `payment` assinada à URL Preview; nunca à Production.
5. Consultar no banco de homologação o pedido, pagamento, evento de webhook e único movimento de estoque.
6. Repetir a mesma notificação para comprovar que não surgem pagamento, baixa ou e-mail duplicados.
7. Revogar qualquer bypass temporário do deployment e registrar os resultados sem dados pessoais ou segredos.
