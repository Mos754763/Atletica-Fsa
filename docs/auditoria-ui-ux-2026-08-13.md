# Auditoria de UI e UX — ATLETICA FSA

## Achados iniciais

| Área | Observação | Direção de ajuste |
| --- | --- | --- |
| Landing page | A identidade visual, contraste e hierarquia do hero estão consistentes. A navegação principal precisa ter a mesma clareza de acesso em telas menores. | Revisar comportamento de navegação móvel e estados de foco. |
| Área de conta | A página autenticada está funcional e os atalhos administrativos já estão separados. A escala do título com nome longo deve continuar priorizando quebras seguras em telas compactas. | Preservar a correção móvel e melhorar a hierarquia dos atalhos operacionais. |
| Loja | O catálogo tem identidade visual consistente, filtros claros e um estado de carrinho explícito. Os itens indisponíveis devem comunicar a ausência de estoque com prioridade visual menor que os produtos disponíveis. | Refinar estados de estoque, contraste e espaçamento dos filtros em dispositivos pequenos. |
| Eventos | A tela vazia está bem direcionada para criar conta, mas a mensagem principal tem quebra visual apertada entre frase e explicação. | Separar a mensagem de estado vazio em linhas/elementos próprios e dar mais respiro ao próximo passo. |
| ODS | A prévia apresentou uma exceção de cliente e bloqueou a navegação subsequente. O componente usa o cliente Supabase síncrono, que não utiliza o fallback público já disponível no projeto. | Corrigir o carregamento do cliente no ODS para usar o fallback assíncrono e manter a tela operacional recuperável. |

## Ajustes implementados

| Frente | Ajuste aplicado | Resultado verificado |
| --- | --- | --- |
| Nomenclatura | O papel técnico `cozinha` continua preservado no RBAC, mas seu rótulo apresentado ao usuário passou a ser **Backoffice**. | A conta, ODS e gestão de membros passam a usar a nova terminologia sem alteração de autorização. |
| ODS | O painel passou a usar o cliente de navegador resiliente à ausência de variáveis públicas no bundle, com conexão em tempo real iniciada de modo seguro. | A página voltou a carregar na prévia autenticada, sem exceção de cliente. |
| ODS | O fundo claro que reduzia drasticamente o contraste do painel foi removido. | Cabeçalho, botão de atualização e estado vazio ficam legíveis sobre o contexto operacional escuro. |
| Painel | Cartões clicáveis do painel administrativo receberam a mesma superfície, hierarquia, estado de foco e retorno visual dos cartões estáticos. | Os atalhos mantêm área de toque e indicação de navegação coerentes. |
| Painel | O atalho de relatórios passou a ocupar a segunda linha inteira do grid quando é o último módulo, eliminando a área residual vazia. | A composição administrativa está visualmente equilibrada em desktop e se reduz a uma coluna em telas compactas. |
| Membros | Os indicadores passaram a se ajustar à largura do próprio conteúdo em telas amplas e a ocupar a largura disponível em telas menores. | A área residual cinza foi eliminada, preservando a leitura dos KPIs de equipe. |
| Eventos | A mensagem de agenda vazia foi separada em título e texto auxiliar. | O estado vazio apresenta leitura mais clara e não comprime as duas mensagens. |
| Acessibilidade | Foi incluído foco visível compartilhado e área mínima de 44 px no acionador do menu móvel. | A navegação por teclado e o toque no celular ficam mais previsíveis. |

## Escopo em revisão

Serão verificados os fluxos públicos, loja, eventos, login, conta, ODS e as páginas administrativas de painel, catálogo, pedidos, eventos, membros e relatórios. A terminologia visível de **cozinha** será substituída por **backoffice**, sem renomear o valor técnico do papel ou alterar políticas de acesso.
