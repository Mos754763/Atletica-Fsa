# Decisão de tema da autenticação

## Decisão

A autenticação usará **preferência explícita e persistente do usuário** como prioridade. Na ausência de preferência gravada, a aplicação seguirá `prefers-color-scheme` do sistema operacional. O atributo `data-theme` no elemento raiz será a única fonte de estado visual para o CSS; `color-scheme` será atualizado junto com ele para que controles nativos acompanhem o tema.

O controle continuará acessível por teclado, comunicará seu estado por `aria-pressed` e preservará a posição que o usuário tiver arrastado. O modo escuro receberá tokens próprios de superfície, texto, borda, foco, campo e feedback, em vez de simplesmente inverter as cores. A implementação preservará o azul e o amarelo institucionais, com contraste suficiente para a leitura e a ação.

## Validação inicial

Na prévia do build, o login foi conferido manualmente nos dois estados. Em **modo escuro**, a superfície de autenticação apresentou painel azul-marinho, cartão escuro, texto claro, campos escuros com placeholders legíveis, botão amarelo e foco amarelo de alta distinção. Ao alternar para **modo claro**, o painel retornou às superfícies brancas e à mesma geometria compacta; o rótulo do acionador mudou corretamente para “Escuro”, confirmando que a preferência explícita permanece disponível ao usuário.

Em largura móvel de **390 × 844 px**, com `prefers-color-scheme: dark` sem preferência anterior gravada, o login iniciou diretamente no tema escuro. O hero, a marca, o mascote, o cartão, os campos, o botão Google e o CTA permaneceram alinhados e legíveis, sem corte lateral nem sobreposição. A tela utiliza rolagem vertical natural para manter todos os controles alcançáveis no dispositivo móvel.

## Referências consultadas

- MDN, [`prefers-color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme): a media query detecta a preferência de esquema de cores declarada pelo usuário.
- MDN, [`color-scheme`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/color-scheme): permite informar os esquemas que o agente do usuário pode renderizar adequadamente, incluindo controles nativos.
- W3C WAI, [WCAG 2.2 — contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum): texto e elementos gráficos relevantes precisam de contraste adequado em relação ao fundo.
