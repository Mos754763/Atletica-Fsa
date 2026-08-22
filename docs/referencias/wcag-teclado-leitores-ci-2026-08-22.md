# Referências — teclado, leitores de tela e alertas do CI

**Data de consulta:** 22 de agosto de 2026.

| Tema | Diretriz aplicada | Fonte |
|---|---|---|
| Foco visível | Toda interface operável por teclado precisa disponibilizar indicador de foco visível; o indicador também se submete ao contraste não textual. | [W3C — Understanding SC 2.4.7](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html) |
| Teclado | A WCAG 2.2 estrutura critérios testáveis para interfaces operáveis por teclado, foco e conteúdo em tecnologias web. | [W3C — WCAG 2.2](https://www.w3.org/TR/WCAG22/) |
| Leitores de tela | Componentes de interface precisam expor nome, papel, estado e valor programaticamente determináveis; controles HTML nativos são a base preferencial. | [W3C — Understanding SC 4.1.2](https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html) |
| Alertas condicionais | Expressões de workflow aceitam funções de estado para condicionar etapas ao resultado anterior. | [GitHub Docs — status check functions](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/evaluate-expressions-in-workflows-and-actions#status-check-functions) |

## Limite da automação

Os testes automatizados podem verificar semântica, atributos ARIA, ordem de foco prevista e a existência de foco visível. Eles não substituem teste manual periódico com leitor de tela e teclado real, porque a experiência final depende do navegador e da tecnologia assistiva usada pela pessoa.
