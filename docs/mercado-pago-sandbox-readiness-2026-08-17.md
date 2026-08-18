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

## Próxima sequência operacional

1. Criar um perfil proprietário exclusivo em homologação e aplicar somente a migration de bootstrap ainda pendente.
2. Criar um produto de baixo valor, estoque unitário e pedido identificável exclusivamente no catálogo de homologação.
3. Abrir o Checkout Pro a partir do Preview autenticado como comprador de teste e concluir uma compra aprovada.
4. Aguardar ou reenviar de forma controlada a notificação `payment` assinada à URL Preview; nunca à Production.
5. Consultar no banco de homologação o pedido, pagamento, evento de webhook e único movimento de estoque.
6. Repetir a mesma notificação para comprovar que não surgem pagamento, baixa ou e-mail duplicados.
7. Revogar qualquer bypass temporário do deployment e registrar os resultados sem dados pessoais ou segredos.
