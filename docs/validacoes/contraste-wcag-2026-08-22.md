# Validação automatizada de contraste WCAG

**Data:** 22 de agosto de 2026  
**Escopo:** tokens de tema escuro, superfícies das rotas, autenticação, formulário de interesse, rodapé e ação de Instagram.

## Critérios aplicados

Os contratos automáticos adotam **4,5:1** para texto normal e **3:1** para contraste não textual de bordas e indicadores. As cores semitransparentes são compostas contra o fundo antes da razão ser calculada. Os critérios e a fonte oficial estão registrados em [Referências WCAG de contraste](../referencias/wcag-contraste-2026-08-22.md).

## Cobertura automatizada

| Grupo validado | Exemplos de pares e superfícies cobertos |
|---|---|
| Tema operacional | Texto principal, auxiliar e títulos sobre fundo do ERP e cartões |
| Autenticação | Título, texto auxiliar, placeholder e campo do login/cadastro/recuperação |
| Landing | Formulário de interesse, manifesto, rodapé e conteúdo auxiliar |
| Redes sociais | Rótulo e ícone amarelos do CTA “Seguir a FSA no Instagram”, semântica ARIA e borda do botão |
| Contraste não textual | Borda do CTA social e foco amarelo institucional |
| Cobertura por rota | Raízes de landing, conta, login, loja, eventos, CMS, ODS, ERP, CRM, integrações, membros, relatórios e operações |

## Correção aplicada

A borda do botão de Instagram no rodapé foi ajustada de `rgba(255,255,255,.20)` para `rgba(255,255,255,.46)`. Dessa forma, o limite do controle permanece perceptível contra o azul-marinho escuro e ultrapassa o limiar não textual de 3:1, sem alterar a identidade visual do componente.

## Resultado

A suíte de contraste passou integralmente. Os contratos são executados junto de `pnpm test`, evitando a regressão dos pares críticos quando tokens de tema ou superfícies forem alterados no futuro.

| Verificação | Resultado |
|---|---|
| Testes automatizados | **258 aprovados**, 3 ignorados |
| TypeScript | Aprovado |
| Build de produção | Aprovado |
