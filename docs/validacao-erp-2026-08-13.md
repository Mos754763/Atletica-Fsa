# Validação visual do ERP

Data: 13 de agosto de 2026.

A rota `/erp` foi validada com uma sessão administrativa e redireciona corretamente para `/admin`. A nova área apresenta uma navegação lateral persistente, visão geral operacional, cartões de indicadores e atalhos de módulos. A composição foi verificada em viewport de desktop após a reconstrução da prévia local, com estilos carregados corretamente.

O acesso é apresentado como **ERP FSA / Operação**, com navegação para Pedidos, Catálogo, Eventos, Pessoas, Relatórios e ODS de pedidos. Os indicadores exibem dados retornados pela plataforma.

Na landing page, a navegação e o rodapé agora expõem a entrada **ERP**. A seção de loja usa os novos caminhos de imagem comerciais para Camiseta, Copo, Moletom e Chaveiro; a visualização foi carregada na prévia local com os estilos globais ativos.

O cabeçalho público mantém os atalhos de Loja e Eventos e o CTA principal para a loja permanece disponível. A rota da loja será usada para a conferência específica das fotos dos produtos.

As quatro imagens de produto foram publicadas no bucket público `catalog-assets` da FSA e retornam HTTP 200. A renderização SSR da rota `/loja` entrega URLs otimizadas dessas imagens institucionais para Camiseta, Copo, Moletom e Chaveiro.

Após atualização completa da página, a vitrine passou a exibir as quatro fotografias comerciais: chaveiro, copo, moletom e camiseta. A entrada `/erp` foi também conferida e redireciona para a visão geral administrativa, que apresenta menu lateral persistente e os módulos operacionais previstos.

O cabeçalho da landing passou a expor um link direto para `/erp`; o menu móvel oferece o item equivalente “Acessar ERP”. A versão atual também inclui Backoffice no controle de entrada do layout ERP, mantendo a navegação operacional limitada à visão geral e ao ODS para esse papel.
