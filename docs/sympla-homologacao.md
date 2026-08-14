# Homologação da Integração Sympla

**Estado:** homologação de leitura validada com credencial de servidor.  
**Atualizado em:** 14 de agosto de 2026.

## Evidências verificadas

A documentação pública atual da Sympla declara a URL base `https://api.sympla.com.br/public` e determina o uso do cabeçalho privado `s_token` em operações autenticadas. O portal lista rotas de eventos, pedidos, participantes, apresentações e check-in por participante, número de ingresso e QR Code.[1]

Na documentação pública consultada não há um recurso de webhook ou callback nativo listado. Assim, a primeira homologação deve usar sincronização incremental e limitada de leitura, com cursor persistente, paginação, chave de deduplicação e backoff para `429` e `5xx`; não será criado um listener de webhook Sympla sem confirmação formal do provedor.

## Limites de segurança da primeira fase

1. A credencial `s_token` deve existir apenas em variável de ambiente do servidor (`SYMPLA_API_TOKEN`), nunca em código, banco de dados de configuração público ou navegador.
2. A integração começa em modo **somente leitura**: eventos, pedidos e participantes podem ser listados e normalizados, mas não alterarão estoque interno, pagamento, emissão de ticket ou check-in local.
3. Cada evento vinculado deve declarar um único sistema mestre para vendas, ingressos, check-in e capacidade. Enquanto essa escolha não existir, a plataforma somente mostrará divergências.
4. A homologação utiliza somente a listagem externa de eventos. Pedidos, participantes e check-in permanecem fora do sincronizador até que um evento seja explicitamente vinculado e conciliado.

## Componentes implementados

| Componente | Responsabilidade | Garantia de segurança |
|---|---|---|
| `src/lib/integrations/sympla.ts` | Cliente da API, cabeçalho `s_token`, timeout de 8 segundos e retentativa limitada para rede, `408`, `429` e `5xx`. | O token é lido somente de `SYMPLA_API_TOKEN` no servidor e não integra a resposta da API interna. |
| `src/lib/integrations/sympla-sync.ts` | Consulta e normalização do catálogo de eventos. | Somente cria ou atualiza o cache externo; não chama rotinas de pedido, pagamento, ticket, QR, estoque ou check-in. |
| Migração `20260814210000_sympla_homologation_integration.sql` | Cria integrações, vínculos futuros, registros externos, execuções e fila de falhas. | RLS permite leitura operacional apenas a administradores; payload externo fica separado das tabelas nativas. |
| `/admin/integracoes/sympla` | Painel administrativo para executar e auditar a sincronização manual. | A página e a ação de servidor exigem o papel `admin`. |
| `/api/cron/sympla-sync` | Sincronização incremental a cada 15 minutos após publicação na Vercel. | Requer `Authorization: Bearer CRON_SECRET`, processa somente leitura e devolve `503` em falha para observabilidade. |

## Validação realizada

A credencial de servidor foi aceita pela rota leve de listagem de eventos. A sincronização de homologação foi executada e persistiu somente o catálogo externo e uma execução auditável. Os testes cobrem normalização, envio restrito do token no cabeçalho, rejeição sem retentativa de `401`, conectividade real e persistência de catálogo isolado.

## Próxima decisão operacional

Antes de importar pedidos ou participantes, deve ser escolhido um evento de teste e registrado um vínculo em `event_external_links`. A decisão recomendada para a primeira fase é **Sympla como fonte de inscrições e participantes apenas**, com a ATLETICA FSA mantendo o fluxo proprietário de catálogo, estoque, pagamentos Mercado Pago, QR de retirada e check-in interno. Uma alteração para Sympla como sistema mestre de ingresso/check-in exige reconciliação explícita e não será ativada automaticamente.

## Fonte

[1]: https://developers.sympla.com.br/api-doc/ "Sympla Public API Docs"
