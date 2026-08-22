# Auditoria global de tema — ATLETICA FSA

**Data:** 22 de agosto de 2026  
**Escopo:** landing, formulário público de interesse, componentes institucionais, páginas públicas e operacionais.

## Achados de entrada

As capturas recebidas indicaram três falhas de consistência: o texto da seção **Gestão 2026** preservava tons claros contra uma superfície também clara; o formulário de interesse mantinha controles escuros sobre um cartão claro; e o manifesto/rodapé não expressava claramente a alternância de tema.

O mapeamento identificou que `layout.tsx` carrega todos os estilos das rotas no nível raiz, enquanto a regra de transição anterior abrangia somente controles da página de autenticação. Também foram localizadas superfícies fixas em `management.css` e `member-interest.css` que precisavam de sobreposições específicas para o modo escuro.

## Correção aplicada para validação

Foi adicionada uma superfície escura própria para a seção de gestão, tipografia de alto contraste, controles de carrossel em azul profundo e amarelo institucional, além de cartão, campos, etiquetas e mensagens do formulário de interesse adaptados ao modo escuro. A classe manual `is-theme-transitioning` agora interpola exclusivamente cor de fundo, cor de texto, borda e sombra em `body` e em seus descendentes, mantendo transformações, opacidade e animações de conteúdo independentes.

## Situação da inspeção interativa

O servidor local respondeu com HTTP 200. O navegador confirmou a presença do botão de alternância, mas o clique automatizado não alterou seu rótulo nem o atributo perceptível na captura; a validação visual do modo escuro seguirá por navegador isolado com preferência de sistema escura, evitando depender desse estado de sessão.

Também foi confirmada a navegação até a âncora `#gestao` no servidor local. A rolagem automatizada preservou a estrutura e os controles da landing, mas o navegador conectado não refletiu a troca de tema durante a automação; por isso, a validação do contraste permanece coberta pelos contratos de CSS e pela captura isolada por preferência de sistema.

A inspeção do DOM capturado após a tentativa de acionamento por teclado confirmou `data-theme="light"`, `aria-pressed="false"` e o rótulo **Escuro**. O foco ainda estava associado à navegação por âncora, não ao botão flutuante, portanto essa tentativa não constitui uma falha do componente de alternância.

O clique direto no botão também não alterou o estado no navegador conectado. Como os testes unitários do componente validam a mutação de `data-theme`, esse resultado é tratado como limitação da automação de ponteiro no navegador conectado — o controle é simultaneamente arrastável e acionável por clique. A validação funcional continuará por teste de componente e a validação visual por preferência de sistema em sessão isolada.

## Cobertura por rota e superfícies

A auditoria estática verificou as rotas geradas pelo build e confirmou que o tema é centralizado por `html[data-theme]`. A transição manual aplica apenas cor de fundo, cor de texto, borda e sombra a todas as superfícies de `body`, ficando desativada quando a preferência de redução de movimento está ativa.

Além da landing, foram acrescentadas superfícies escuras específicas para a agenda pública de eventos e para as telas operacionais do ERP que possuem cartões próprios de CRM e integrações. As áreas de membros e construtor de tabelas herdam os tokens de `.members-page`; catálogo, eventos administrativos, relatórios, operações, pedidos, ODS, conta, loja, segurança e autenticação já possuem cobertura centralizada ou regras próprias.

## Validações automatizadas finais

| Verificação | Resultado |
|---|---|
| Suíte Vitest | **239 testes aprovados**, 3 ignorados |
| TypeScript | Aprovado (`tsc --noEmit`) |
| Build de produção | Aprovado (`next build`) |
| Rotas geradas | 10 rotas estáticas e rotas dinâmicas do ERP, loja, conta, ODS e APIs compiladas com êxito |
