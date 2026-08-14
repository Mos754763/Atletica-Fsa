# Inspeção visual local — 14 de agosto de 2026

| Rota | Resultado observado | Ação registrada |
|---|---|---|
| `/eventos` | Hero, navegação e estado vazio renderizados corretamente quando não existem eventos publicados. | Nenhuma correção necessária no estado vazio. |
| `/loja` | Cabeçalho, filtros e carrinho renderizados. Os cards mostraram área de mídia visualmente vazia no ambiente local e os produtos estão indisponíveis por saldo atual. | Investigar e corrigir o fallback de imagem dos cards; manter indisponibilidade enquanto não houver estoque cadastrado. |

As fotos institucionais foram consultadas diretamente no bucket público e estão válidas (HTTP 200, produto visível). A correção aplicada substitui a camada de otimização no card por imagens diretas com carregamento prioritário, mantendo o bucket público já permitido e adicionando dimensões explícitas via CSS. Após o carregamento completo da página, os cards de chaveiro e copo exibiram corretamente as fotos institucionais, sem formas geométricas sobrepostas.

Esta inspeção não realizou inscrição, checkout, pagamento ou alteração de dados.
