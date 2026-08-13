# Auditoria técnica — ATLETICA FSA

**Data:** 13 de agosto de 2026  
**Escopo:** validação não destrutiva de rotas, autenticação, papéis, Supabase, pedidos, eventos, ODS, e-mail, cron, Storage e integrações externas.

## Evidências iniciais

| Área | Inventário identificado | Estado inicial |
| --- | --- | --- |
| Páginas | 14 páginas públicas, de conta, operação e administração | Em auditoria |
| APIs | Checkout, cron de lembretes, ODS e webhook Mercado Pago | Em auditoria |
| Ações de servidor | Catálogo, eventos, membros e inscrição em eventos | Em auditoria |
| Dependências | Next.js, Supabase SSR/JS, Resend, Zod, pg e Vitest | Em auditoria |
| Agendamento | `GET /api/cron/event-reminders` diariamente às 13:00 UTC | Em auditoria |

## Método

O trabalho não cria pedidos, não confirma pagamentos, não envia e-mails de teste, não cria usuários de teste e não altera dados operacionais. O Mercado Pago será avaliado por contrato de código e documentação, pois as credenciais de produção permanecem pendentes.

## Pagamentos — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Autenticação do checkout | A rota exige sessão e perfil antes de criar pedido | Conforme |
| Preço e estoque | Produtos, preço e disponibilidade são consultados no banco; o navegador não informa o total | Conforme |
| Validação de entrada | Itens, quantidade e modalidade são validados por esquema | Conforme |
| Assinatura de webhook | A rota exige `x-signature` e busca o pagamento diretamente no Mercado Pago | Conforme, sujeito à conferência documental |
| Idempotência | Pagamento usa referência única do provedor e histórico só é criado em mudança de estado | Conforme |
| Integridade financeira | O valor recebido do provedor ainda não é comparado ao total persistido do pedido | Requer correção segura |
| Consistência em falhas | A criação do pedido, itens e preferência ocorre em etapas independentes; uma falha posterior pode deixar pedido pendente sem preferência | Requer mitigação |
| Reserva concorrente de estoque | A disponibilidade é verificada, mas não há reserva/baixa transacional no checkout | Requer decisão operacional antes de ativar vendas concorrentes |

## Webhook e automação — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Comparação criptográfica | O hash HMAC usa comparação de tempo constante e rejeita cabeçalhos incompletos | Conforme |
| Proteção do cron | A rota de lembretes exige `Authorization: Bearer CRON_SECRET` | Conforme |
| Janela de lembrete | A busca contempla eventos entre 23 e 25 horas futuras, coerente com a execução diária prevista | Conforme, com margem operacional limitada |
| Duplicidade de e-mail | O cron delega o envio a uma camada transacional que deve ser conferida quanto à chave de idempotência | Em auditoria |
| Escalabilidade do cron | Eventos e inscrições são processados sequencialmente; listas muito grandes podem exceder o tempo da função | Risco operacional a acompanhar |

## Supabase, RLS e RBAC — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Cobertura RLS | As 14 tabelas de domínio têm RLS explicitamente habilitado | Conforme |
| Perfil próprio | Usuário só lê e atualiza o próprio perfil; o gatilho preserva papel e e-mail quando a alteração é do próprio usuário | Conforme |
| Gestão de perfis | Leitura e alteração global de perfis são reservadas a administrador | Conforme |
| Pedidos e pagamentos | Cliente lê somente seus registros; equipe recebe leitura conforme papel | Conforme |
| Catálogo | Leitura pública limitada a produtos/categorias ativos, exceto para gestor de catálogo | Conforme |
| Registros de eventos | Cliente cria inscrição própria como pendente e equipe gerencia inscrições | Conforme |
| Eventos por papel | A política de banco considera `cozinha` e `caixa` como equipe capaz de alterar eventos, embora o fluxo de interface limite eventos a administrador | Inconsistência de privilégio a corrigir |
| Eventos públicos | Eventos de qualquer estado são visíveis por política pública | Decisão de produto a confirmar; não é falha de integridade |

## Cliente de serviço e APIs — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Uso do segredo Supabase | O cliente privilegiado só é criado em código de servidor e desabilita persistência/renovação de sessão | Conforme |
| Verificação de API | O endpoint de checkout valida o bearer token junto ao Supabase Auth antes de consultar perfil | Conforme |
| Escopo de dados após autenticação | As operações da API usam cliente de serviço após validar usuário, portanto cada rota precisa aplicar explicitamente sua própria regra de papel/escopo | Em auditoria nas rotas restantes |
| Checkout do cliente | O checkout é propositalmente disponível a qualquer usuário autenticado, com pedido vinculado ao perfil validado | Conforme |

## ODS e comunicação transacional — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Acesso ao ODS | A API aceita somente administrador ou cozinha, mesmo usando cliente privilegiado | Conforme |
| Mudança de estado | A atualização operacional usa a máquina de estados antes de gravar o pedido | Conforme |
| Auditoria de fila | A mudança no ODS persiste o responsável e uma nota no histórico | Conforme |
| E-mail de estado | Falha do provedor não reverte a mudança do pedido, evitando indisponibilidade de operação | Conforme |
| Idempotência de e-mail | Há busca prévia por entrega, mas não há restrição única no banco nem reserva antes do envio | Requer endurecimento contra corrida e repetição após falha parcial |
| Conteúdo HTML | Dados administrativos de evento/pedido são interpolados em HTML; escape explícito deve ser aplicado antes de incorporar conteúdo textual | Requer correção segura |

## Verificação de produção — rotas públicas

| Rota | Evidência observada em produção | Situação |
| --- | --- | --- |
| `/` | Landing page respondeu com navegação, Gestão 2026 e imagens institucionais carregadas | Conforme |
| `/loja` | Catálogo, categorias e carrinho responderam; produtos sem estoque foram corretamente marcados como indisponíveis | Conforme |
| Assets institucionais | Hero, gestão e padrão visual carregaram a partir do domínio publicado | Conforme |

## Loja e inscrições — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Carrinho no cliente | Interface limita quantidade ao estoque exibido, mas o servidor recalcula estoque e preço no checkout | Conforme |
| Token de checkout | A sessão do Supabase é enviada como bearer somente ao endpoint interno de checkout | Conforme |
| Inscrição gratuita | Evento aberto e gratuito cria inscrição confirmada, envia confirmação e fornece código de check-in | Conforme |
| Capacidade | Há contagem prévia de inscrições, mas sem reserva transacional; envios simultâneos podem exceder capacidade | Requer mitigação antes de alto volume |
| Inscrição paga | A inscrição é criada como pendente e a ação informa que o pagamento será liberado, porém não inicia uma cobrança associada | Lacuna funcional a resolver antes de vender inscrições pagas |
| Inscrição duplicada | A restrição única por evento e participante trata duplicidade de forma explícita | Conforme |

## Sessão e páginas protegidas — evidências preliminares

| Controle | Evidência | Situação |
| --- | --- | --- |
| Guarda de servidor | `requireRole` valida o usuário pela sessão SSR, consulta o perfil e bloqueia papéis não autorizados por redirecionamento | Conforme |
| Fonte do papel | A decisão de acesso é tomada no servidor a partir do perfil persistido, não de estado informado pelo navegador | Conforme |
| Renovação de sessão | O middleware atualiza a sessão Supabase quando a configuração pública está disponível | Conforme |
| Defesa em profundidade | O middleware não decide autorização de URL; as páginas e APIs aplicam guardas próprios | Conforme |

## Dependências — evidências preliminares

| Severidade | Dependência transitiva | Origem | Atualização disponível |
| --- | --- | --- | --- |
| Alta | `sharp` anterior a `0.35.0` | `next@15.5.23` | `sharp >= 0.35.0` |
| Alta | `postcss` anterior a `8.5.12` | `next@15.5.23` | `postcss >= 8.5.12` |
| Alta | `postcss` anterior a `8.5.18` | `next@15.5.23` | `postcss >= 8.5.18` |

O auditor encontrou cinco vulnerabilidades de produção, sendo três altas e duas moderadas. A atualização será limitada a versões compatíveis de manutenção e passará por todos os testes antes de qualquer sincronização.

## Conformidade externa — referências verificadas

| Integração | Referência | Evidência comparada |
| --- | --- | --- |
| Mercado Pago Webhooks | https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/notifications | Checkout Pro deve assinar notificações de pagamento por webhook e receber HTTPS POST; a aplicação já possui endpoint e validação de assinatura. |
| Mercado Pago assinatura | https://www.mercadopago.com.ar/developers/en/docs/checkout-pro/payment-notifications | A assinatura usa `x-signature`, `x-request-id` e o identificador `data.id`; a implementação segue esse modelo e consulta o pagamento no servidor antes de conciliar. |
| pnpm overrides | https://pnpm.io/10.x/settings | Overrides devem ser configurados no arquivo raiz de workspace e a resolução resultante precisa ser conferida no lockfile. |

## Matriz de rotas de produção

As sondas HTTP não destrutivas foram realizadas em `https://atletica-fsa.vercel.app` sem sessão autenticada. As rotas públicas `/`, `/loja`, `/eventos` e `/login` retornaram `200`. As rotas protegidas `/conta`, `/admin`, `/admin/catalogo`, `/admin/eventos`, `/admin/relatorios`, `/admin/membros`, `/admin/pedidos` e `/ods` redirecionaram corretamente para `/login` com `307`.

Os endpoints de integração mantiveram a fronteira esperada: `GET /api/checkout` e `GET /api/payments/mercado-pago/webhook` retornaram `405`; `GET /api/ods/orders` e `GET /api/cron/event-reminders` retornaram `401`. A resposta da landing page publicada não continha referências a `/manus-storage/`.

## Correções de consistência aplicadas

1. O checkout agora devolve `400` para estoque indisponível em vez de permitir exceção não tratada.
2. Uma falha ao criar a preferência do Mercado Pago cancela o pedido pendente e registra o histórico, evitando resíduos ativos na operação.
3. O webhook compara o valor em centavos retornado pelo Mercado Pago com o total interno antes de conciliar o pedido.
4. A atualização de pedidos no ODS agora condiciona a escrita ao estado lido, impedindo que duas operações concorrentes avancem a mesma ordem silenciosamente.

## Validação local de produção

`pnpm typecheck`, 18 testes automatizados e `NODE_ENV=production pnpm build` foram concluídos com sucesso. As rotas dinâmicas protegidas e todos os endpoints foram incluídos no artefato de build. Permanecem apenas avisos de compatibilidade CSS do Autoprefixer relacionados a `start/end`; não impedem a compilação e não afetam controle de acesso ou lógica operacional.

## Cabeçalhos defensivos

O domínio publicado já fornece HSTS. Foram adicionados também `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin` e uma `Permissions-Policy` que desabilita câmera, microfone, geolocalização e Payment Request API. Uma Content Security Policy não foi adicionada nesta etapa porque precisa ser compatibilizada com Supabase, Mercado Pago e os estilos atuais sem comprometer checkout ou autenticação.

## Dependências

A auditoria de dependências de produção reportou cinco alertas transitivos sem correção automática publicada pelo gerenciador: quatro relacionados ao PostCSS que vem fixado pela linha mais recente disponível do Next.js 15.5 (`15.5.23`) e um relacionado ao `sharp`/libvips. Não foi forçada uma substituição incompatível, pois a tentativa não alcançaria a árvore runtime do Next.js e poderia quebrar a compilação. O risco residual deve ser reavaliado na próxima versão de manutenção do Next.js; o projeto não processa CSS nem imagens arbitrárias fornecidas por usuários no runtime atual.

## Configuração de produção pendente

As sondas de escrita sem credenciais retornaram `503` em Checkout e webhook porque o ambiente atualmente publicado ainda não expôs um par válido de variáveis do Mercado Pago. Isso é o comportamento seguro enquanto a integração não está configurada: não cria cobrança nem pedido por acesso público. Depois de preencher os valores na Vercel, é obrigatório um novo deploy e um teste de ponta a ponta no ambiente sandbox do Mercado Pago.

## Limites da verificação não destrutiva

Não foram enviados e-mails, convites, pagamentos, webhooks assinados ou alterações em pedidos reais. Os fluxos autenticados foram validados por guards de rota, código, RLS e testes automatizados; sua operação completa requer uma sessão de teste e credenciais de sandbox do Mercado Pago, que não foram utilizadas nesta auditoria para preservar os dados e evitar efeitos operacionais.
