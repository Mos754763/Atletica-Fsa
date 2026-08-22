# Decisão de arquitetura — acessibilidade no CI, teclado e leitores de tela

**Data:** 22 de agosto de 2026  
**Status:** aprovado para implementação

## Alerta de falha WCAG no CI

O GitHub Actions executará a etapa de contraste com identificador próprio e permitirá que ela conclua antes de encerrar o job. Quando o resultado for `failure`, uma etapa posterior enviará um payload mínimo ao Slack com repositório, branch, commit e URL do run. A notificação usa exclusivamente o segredo de repositório `CI_SLACK_WEBHOOK_URL`; o valor nunca será gravado em código, logs ou documentação.

> Se o segredo ainda não estiver configurado, o workflow preservará o bloqueio por contraste e emitirá um aviso de configuração. A ausência de webhook não deve mascarar a falha de acessibilidade.

## Matriz de cobertura automatizada

| Critério | Contrato automatizado | Componente prioritário |
|---|---|---|
| Navegação por teclado | Sem `tabIndex` positivo; setas, `Home` e `End` movimentam o seletor customizado. | Carrossel da gestão |
| Foco visível | Regra `:focus-visible` nos controles interativos críticos. | Tema, formulário de interesse e autenticação |
| Nome, papel e estado | Botões customizados declaram nome acessível, estado e relação com o conteúdo controlado. | Navegação móvel, alternador de tema e carrossel |
| Feedback de formulário | Resultados assíncronos expõem região de status ou alerta. | Interesse de membro e autenticação |
| Estrutura semântica | Landmarks, rótulos, `fieldset`/`legend` e textos alternativos apropriados. | Landing e formulário público |

Os contratos automatizados verificam a estrutura e previnem regressões em código. Eles complementam, mas não substituem, revisões manuais periódicas com teclado físico e leitores de tela.
