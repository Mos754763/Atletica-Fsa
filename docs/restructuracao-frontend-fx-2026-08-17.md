# Reestruturação Frontend FX — Evidências e Diretrizes

## Linha de base verificada

Em 17 de agosto de 2026, a landing local foi aberta em uma instância isolada após a consolidação inicial de tema e efeitos. O conteúdo principal permaneceu legível após a conclusão das revelações: título, texto de apoio, CTAs, navegação e o seletor de tema continuaram acessíveis. A nova camada decorativa não recebeu eventos de ponteiro e não bloqueou os links ou botões sobrepostos.

| Verificação | Resultado |
|---|---|
| Verificação de tipos | Concluída sem erros. |
| Suíte unitária | 106 testes aprovados; 3 testes de integração externa permanecem opt-in. |
| Build de produção | Concluído. Os avisos restantes são de compatibilidade de valores flex em estilos preexistentes. |
| Landing, tema inicial escuro | Conteúdo e CTAs visíveis depois da animação inicial. |

Após a evolução da loja e a correção de tema do ODS, a verificação de tipos foi concluída sem erros, a suíte automatizada registrou 106 testes aprovados e 3 testes de integração externa opt-in ignorados, e o build de produção terminou com êxito. Permanecem apenas avisos preexistentes do Autoprefixer para `start` e `end` em CSS; eles não interrompem a compilação nem a geração de rotas.

## Fundação aplicada

A preferência de tema continua priorizando uma escolha persistida e utiliza o modo escuro como padrão de primeira visita. O alternador emite o evento `themechange` para que superfícies canvas ajustem a composição sem depender de estado duplicado.

A camada `FrontendFx` mantém aurora e partículas em canvas de resolução reduzida, com teto de 24 fps para aurora, 30 fps para partículas e DPR máximo de 1,25. Ela pausa em aba oculta e se desativa em `prefers-reduced-motion`. As revelações existentes deixaram de animar `filter: blur()`, mantendo somente opacidade e transformação para evitar repintura excessiva.

## Próxima inspeção obrigatória

Antes de considerar a frente visual concluída, devem ser revisadas em navegador as jornadas de loja, detalhe de produto, carrinho, eventos, ERP, Admin e ODS nos dois temas e em viewport móvel. A correção conhecida a confirmar é a coexistência de seletores antigos `.dark` no ODS com o padrão atual `html[data-theme="dark"]`.

## Pré-requisitos externos da liquidação sandbox

A documentação oficial do Mercado Pago orienta que a compra de Checkout Pro seja feita em janela anônima, autenticada com uma conta de teste compradora, e que a aprovação seja simulada com cartão de teste e o titular `APRO`, usando o CPF de teste indicado pelo próprio provedor. A conta vendedora deve permanecer associada às credenciais de teste configuradas exclusivamente no ambiente Preview. A referência oficial é [Realizar compras de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/integration-test/test-purchases).

O ensaio FSA ainda depende de login no painel do Mercado Pago para confirmar a vinculação da aplicação e da criação do produto, usuário autenticado e pedido exclusivos do Supabase de homologação. Nenhuma credencial, senha, token ou dado de teste foi incluído neste documento.

## Atualização dinâmica do catálogo

A consulta pública ao Supabase de homologação confirmou que o produto de teste ativo está legível sob as políticas de catálogo. A rota `/loja`, porém, continuava a servir uma renderização anterior porque não declarava comportamento dinâmico. Ela passou a utilizar `dynamic = "force-dynamic"`, alinhando-se à landing e ao ODS e permitindo que alterações de catálogo e estoque sejam refletidas sem depender de uma gravação administrativa para invalidar a página.

A implementação foi enviada pelo commit `9c06672`. O workflow GitHub Actions `32089811888` concluiu com sucesso, cobrindo tipagem, testes e build de produção.
