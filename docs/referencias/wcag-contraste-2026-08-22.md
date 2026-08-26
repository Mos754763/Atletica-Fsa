# Referências de contraste WCAG para testes automatizados

**Consultado em:** 22 de agosto de 2026.

| Critério | Aplicação no projeto | Limiar adotado |
|---|---|---:|
| WCAG 2.2 SC 1.4.3 — Contrast (Minimum), nível AA | Texto padrão, placeholders, rótulos, links, texto de botões e mensagens | 4,5:1 |
| WCAG 2.2 SC 1.4.3 — texto grande | Títulos grandes que satisfaçam a definição formal | 3:1 |
| WCAG 2.1 SC 1.4.11 — Non-text Contrast, nível AA | Bordas de campos, ícones de controles e indicadores de foco | 3:1 |

> As razões são limiares exatos e não devem ser arredondadas para aprovação. Para cores sólidas, o cálculo usa luminância relativa sRGB e a razão `(L1 + 0,05) / (L2 + 0,05)`.

Os contratos desta aplicação usarão 4,5:1 como padrão conservador para texto e 3:1 para componentes visuais não textuais. Pares translúcidos serão compostos contra sua superfície de fundo antes da medição.

## Fontes oficiais

1. [Understanding Success Criterion 1.4.3: Contrast (Minimum) — W3C WAI](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum)
2. [Technique G18: Ensuring a contrast ratio of at least 4.5:1 — W3C WAI](https://www.w3.org/WAI/WCAG22/Techniques/general/G18)
3. [Understanding SC 1.4.11: Non-text Contrast — W3C WAI](https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html)
4. [How to Meet WCAG 2.2 — Quick Reference — W3C WAI](https://www.w3.org/WAI/WCAG22/quickref/)
