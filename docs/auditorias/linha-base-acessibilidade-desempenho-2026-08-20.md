# Linha de base de acessibilidade e desempenho — 20 de agosto de 2026

## Escopo e método

Esta auditoria é **não destrutiva**. Ela mede rotas públicas em Production por meio do Lighthouse e registra observações visuais das rotas operacionais em sessão autenticada, sem criar pedidos, alterar estados, enviar notificações ou modificar dados reais.

| Grupo | Rotas prioritárias | Tipo de evidência |
| --- | --- | --- |
| Público | `/`, `/loja`, `/eventos`, `/login`, `/redefinir-senha` | Lighthouse: desempenho e acessibilidade |
| Operacional autenticado | `/erp` e `/ods` | Inspeção visual e de navegação sem mutações |
| Operacional anônimo | `/admin`, `/erp`, `/ods` | Controle de redirecionamento e proteção de acesso |

> As métricas de Lighthouse representam execuções sintéticas em emulação móvel padrão e no preset desktop/headless. Elas são uma linha de base comparável, não uma garantia de experiência em todos os dispositivos, redes ou sessões autenticadas. A métrica de interatividade registrada é **TTI**; esta auditoria não substitui a coleta de INP de usuários reais.

## Evidência visual autenticada inicial

| Rota | Resultado observado | Ação tomada |
| --- | --- | --- |
| `/erp` | A visão geral carregou com a navegação lateral, cartões de KPI e módulos operacionais disponíveis para usuário autorizado. O recorte exibiu o texto alternativo do mascote no topo direito, em vez da imagem esperada, sugerindo falha de carregamento visual específica da rota. | Nenhuma mutação executada. |
| `/ods` | A fila do backoffice carregou, com retorno ao ERP, ação de atualização, criação de pedido e alternância de tema disponíveis. A fila estava vazia e nenhuma ação operacional foi disparada. | Nenhuma mutação executada. |
| `/admin/catalogo` | O catálogo administrativo carregou com campos rotulados para produto, preço e estoque, gerenciamento de variações, prévia de landing/loja, filtros de inventário e navegação lateral. As ações de salvar, criar categoria, upload e alteração de estoque não foram acionadas. | Nenhuma mutação executada. |

## Resultado Lighthouse — emulação móvel

| Rota | Desempenho | Acessibilidade | FCP | LCP | TBT | CLS | TTI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 69 | 93 | 4,0 s | 4,2 s | 110 ms | 0 | 4,6 s |
| `/loja` | 82 | 96 | 2,3 s | 2,3 s | 140 ms | **0,138** | 3,8 s |
| `/eventos` | 93 | 100 | 2,1 s | 2,1 s | 100 ms | 0,058 | 3,2 s |
| `/login` | 93 | 100 | 2,2 s | 2,3 s | 50 ms | 0 | 3,6 s |
| `/redefinir-senha` | 79 | 100 | 3,6 s | 3,6 s | 40 ms | 0,005 | 3,6 s |

## Resultado Lighthouse — desktop

| Rota | Desempenho | Acessibilidade | FCP | LCP | TBT | CLS | TTI |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `/` | 88 | 90 | 1,2 s | 1,2 s | 0 ms | 0,008 | 1,2 s |
| `/loja` | **55–87** (3 execuções) | 96 | 1,2–7,0 s | **1,2–7,0 s** | 0 ms | 0,042 | 1,2–7,0 s |
| `/eventos` | 87 | 100 | 1,4 s | 1,4 s | 0 ms | 0,001 | 1,4 s |
| `/login` | 91 | 100 | 1,2 s | 1,2 s | 0 ms | 0,002 | 1,2 s |
| `/redefinir-senha` | 89 | 100 | 1,3 s | 1,3 s | 0 ms | 0,001 | 1,3 s |

> A loja apresentou variação relevante na medição desktop: 55, 70 e 87 pontos, com LCP entre 7,0 s, 3,9 s e 1,2 s. A variação deve ser tratada como risco de observabilidade e investigada com uma série maior antes de fixar uma meta de nota isolada para essa rota.

## Controles de acesso operacionais

| Rota anônima | Resposta observada | Avaliação |
| --- | --- | --- |
| `/admin` | HTTP 307 para `/login` | Conforme a proteção esperada. |
| `/erp` | HTTP 307 para `/login` | Conforme a proteção esperada. |
| `/ods` | HTTP 307 para `/login` | Conforme a proteção esperada. |

## Achados e prioridades

| Prioridade | Achado | Evidência | Critério de correção |
| --- | --- | --- | --- |
| P1 | Controles do carrossel da Gestão menores que o alvo de toque recomendado. | Botões de abas entre 6×6 px e 7×7 px em `section.people-carousel`; o auditor recomenda ao menos 24×24 px. | Todos os controles alcançam área clicável mínima de 24×24 px, mantêm foco visível e preservam navegação por teclado. |
| P1 | Semântica ARIA inválida na landing. | `div.hero-ticker` e, em execução móvel, a marca do rodapé usam `aria-label` em `div` sem papel válido. | Não haver `aria-prohibited-attr` na auditoria da landing. |
| P1 | Nomes acessíveis divergentes do texto visível. | Link do Instagram tem texto “Seguir a FSA” e nome acessível distinto; os botões visuais da loja expõem “Ver produto” mas recebem outro `aria-label`. | Não haver `label-content-name-mismatch` nas rotas públicas. |
| P1 | Carrinho fechado da loja mantém controles focalizáveis sob `aria-hidden="true"`. | `aside.store-cart` fechado contém backdrop, fechar e “Ver produtos” focalizáveis. | Carrinho fechado não contém foco navegável; o aberto mantém foco e retorno previsível ao acionador. |
| P1 | Contraste marginal no selo dos cartões da Gestão. | Marca “FSA” com razão 4,46:1 sobre fundo amarelo; a regra requer 4,5:1. | Razão mínima de 4,5:1 para texto normal no componente. |
| P1 | O mascote visual do ERP não carregou na inspeção autenticada. | O navegador exibiu texto alternativo onde deveria estar a imagem no cabeçalho do ERP. | A imagem responde com sucesso ou existe fallback visual equivalente e intencional. |
| P2 | LCP móvel acima da meta na landing e na redefinição de senha. | LCP de 4,2 s em `/` e 3,6 s em `/redefinir-senha`. | LCP móvel ≤2,5 s em uma série de medições comparáveis, ou justificativa documentada para conteúdo não crítico. |
| P2 | Instabilidade de carregamento na loja em desktop. | Três execuções: LCP de 7,0 s, 3,9 s e 1,2 s. | Mediana e p75 documentados em cinco execuções; nenhuma regressão de LCP acima do orçamento aprovado. A documentação do Lighthouse recomenda interpretar o resultado como distribuição, pois condições de execução podem variar. [2] |
| P2 | Deslocamento de layout acima da referência na loja móvel. | CLS 0,138 em `/loja`. | CLS ≤0,10 em uma série de medições comparáveis. |

## Correção P1 e reauditoria local — 20 de agosto de 2026

As correções foram executadas em branch isolada, sem alterações de dados, credenciais ou fluxos de pagamento. A verificação final usou o build de produção local com Lighthouse 12.8.2, limitado à categoria de acessibilidade. A landing e a loja obtiveram **100/100** e não apresentaram auditorias com pontuação zero nessa amostra. A medição de desempenho em Production permanece como linha de base P2 e não foi substituída por esta reauditoria local.

| Achado P1 original | Correção aplicada | Evidência de validação |
| --- | --- | --- |
| Alvos de toque e contraste do carrossel | As abas do carrossel passaram a ter área clicável de 32×32 px, foco visível e marca em `--fsa-black` sobre o selo amarelo. | Contrato de CSS e reauditoria da landing com acessibilidade 100. |
| ARIA inválida na landing | O wordmark compacto recebeu `role="img"` junto ao nome acessível; a versão textual não recebe mais `aria-label` redundante. | A falha `aria-prohibited-attr` não foi reportada na reauditoria. |
| Nome acessível divergente na loja | As ações de produto agora incluem o texto visual “Destaque” e, quando aplicável, “FSA” no rótulo acessível. | A falha `label-content-name-mismatch` não foi reportada na reauditoria. |
| Foco no carrinho oculto | O carrinho fechado recebe `hidden`; a abertura move o foco para o botão de fechar e o encerramento retorna ao acionador. | Contrato da vitrine cobre os atributos e o comportamento de foco. |
| Mascote indisponível no ERP | O componente usa o asset institucional `fsa-hero-gestao-2026.png` e mantém fallback ilustrado, responsivo e semântico quando a mídia falha. | Contrato específico do mascote e build de produção aprovados. |

> A confirmação visual autenticada do cabeçalho de `/erp` será repetida no Preview da revisão e em Production após a promoção. A correção já possui fallback visual, portanto a ausência eventual do asset não volta a expor somente texto alternativo na interface.

## Critérios de regressão propostos

| Área | Critério mínimo antes de promover alteração visual ou de navegação |
| --- | --- |
| Acessibilidade pública | Nota Lighthouse ≥95; zero falhas em ARIA proibido, foco em conteúdo oculto, nome acessível divergente, contraste e alvo de toque. |
| Desempenho móvel | LCP ≤2,5 s, TBT ≤200 ms e CLS ≤0,10 nas rotas públicas prioritárias. Os limites de LCP e CLS seguem a referência de experiência “boa” para Core Web Vitals. [1] |
| Desempenho desktop | LCP ≤2,5 s e CLS ≤0,10; medições críticas devem usar ao menos cinco execuções e registrar mediana e p75. [1] [2] |
| Operação protegida | Sem sessão, `/admin`, `/erp` e `/ods` devem redirecionar para `/login`; com conta autorizada, a página deve renderizar sem erro de mídia ou bloqueio visual. |

## Reexecução reproduzível

```bash
pnpm dlx lighthouse@12.8.2 'https://atleticafsa.site/loja' \
  --preset=desktop \
  --only-categories=performance,accessibility \
  --output=json \
  --output-path=/tmp/atletica-baseline-loja-desktop.json \
  --chrome-flags='--headless --no-sandbox' \
  --no-enable-error-reporting \
  --quiet

node scripts/summarize-lighthouse-baseline.mjs \
  'Loja=/tmp/atletica-baseline-loja-desktop.json'
```

O extrator versionado `scripts/summarize-lighthouse-baseline.mjs` converte as saídas JSON em tabela Markdown e detalha as falhas da categoria de acessibilidade com a opção `--accessibility-details`.

## Limitações conhecidas

- A inspeção das áreas autenticadas foi visual e não efetuou mutações. Uma medição Lighthouse com sessão de QA isolada ainda é necessária para perfis de desempenho de ERP, ODS e módulos administrativos.
- Esta linha de base não substitui telemetria de usuários reais; o INP deve ser acompanhado por uma solução de RUM antes de se tornar um critério de produção.
- As credenciais, os pagamentos e quaisquer dados de Production não foram alterados durante esta auditoria.

## Referências

[1] [How the Core Web Vitals metrics thresholds were defined — web.dev](https://web.dev/articles/defining-core-web-vitals-thresholds)

[2] [Lighthouse performance scoring — Chrome for Developers](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
