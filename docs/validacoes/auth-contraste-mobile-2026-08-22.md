# Auditoria de contraste — autenticação e formulário móvel

**Data:** 22 de agosto de 2026  
**Escopo:** login, criação de conta, recuperação/redefinição de senha e formulário público de interesse na Atlética.

## Inspeção inicial

A tela de login em desktop foi aberta no navegador conectado. No modo claro, a identidade, campos, ações e links apresentam separação visual adequada. O botão flutuante de tema foi acionado, mas o estado não mudou nessa automação porque o controle também suporta arrasto e a interação de ponteiro foi interpretada sem a ativação do botão. Esse comportamento já foi observado durante a auditoria global anterior; a alternância permanece coberta por testes de componente.

## Verificação estática de contraste

O login compartilha tokens dedicados de autenticação no tema escuro: superfícies `#04142e`, `#061a3d`, `#0d294f` e `#061a32`; texto principal `#f7faff`; texto auxiliar `#c2cee2`; e foco amarelo institucional. A criação de conta e a recuperação de senha usam o mesmo `LoginForm`, portanto herdam os mesmos campos, estados de sucesso/erro e regras de foco. A redefinição de senha possui ainda regras específicas para cartão, campos, confirmação e feedback no modo escuro.

## Formulário de interesse móvel

O CSS do formulário troca para uma única coluna a até 520 px, reduz o preenchimento para 19 px e preserva largura integral dos campos, mensagens, consentimento e botão. A captura isolada via navegador sem interface gerou apenas a superfície de fundo, sem conteúdo renderizado; por isso ela não é usada como evidência de layout e a validação visual seguirá em navegador navegável e pelos contratos de estilo.

## Interação no navegador conectado

As tentativas de alterar o modo de autenticação e o tema pelo navegador conectado não produziram o estado esperado: o primeiro gesto não disparou a ação e a segunda tentativa recebeu um instantâneo desatualizado do navegador. Esse é um limite da sessão de automação atual, não uma falha atribuível ao formulário. Os estados seguem cobertos pelo componente `LoginForm` e serão verificados pela suíte automatizada.

## Capturas móveis em tema escuro

A captura isolada a 390 × 844 confirmou o cabeçalho, hero, seletor de tema e faixa de destaque sem transbordamento horizontal no modo escuro. A navegação direta para `#participar`, embora use o identificador correto, produziu uma tela com apenas a superfície escura no navegador sem interface; o renderizador não estabilizou o scroll de âncora para uma posição pintável. Portanto, essa segunda captura não é usada para julgar o formulário. A verificação da grade móvel segue sustentada pela regra `@media(max-width:520px)`, que troca o formulário para uma coluna com 19 px de preenchimento, e será complementada no navegador navegável.

No navegador navegável, a landing expõe integralmente os campos, interesses, consentimento e ação do formulário na árvore acessível. A rolagem automatizada não mudou a posição do viewport, embora a página tenha 4.711 px abaixo da dobra; assim, a inspeção visual de detalhe do formulário será concluída pelo contrato responsivo e pelo teste de regressão, sem usar essa limitação de automação como sinal de defeito de layout.

## Auditoria isolada com navegador em viewport móvel

Uma sessão isolada de navegador, em **390 × 844** com preferência escura, confirmou os valores computados e a geometria efetivamente renderizada:

| Superfície | Resultado |
|---|---|
| Login | Tipografia do cartão e título em `rgb(247, 250, 255)`; campo em `rgb(6, 26, 50)`; texto digitável em `rgb(247, 250, 255)`; largura de página igual à largura do viewport (`390 px`). |
| Cadastro e recuperação | Compartilham o mesmo cartão, rótulos, campos, ações e tokens do login por meio de `LoginForm`; a troca de estado não introduz superfície ou classe de contraste exclusiva. |
| Redefinição de senha | Painel com gradiente escuro institucional, cartão em azul profundo, tipografia clara e campo em `rgb(6, 26, 50)` com texto `rgb(247, 250, 255)`; sem transbordamento horizontal. |
| Formulário “Vem pra FSA” | Grade renderizada em uma coluna (`318 px`), formulário com `358 px` dentro do viewport de `390 px`, sem overflow horizontal; campo em `rgb(6, 26, 50)`, texto em `rgb(237, 244, 255)` e botão de envio com 48 px de altura. |

Os estados de foco de campo, interesses e consentimento também foram reforçados com contorno amarelo institucional de 2 px e deslocamento de 2 px, preservando a navegação por teclado no tema escuro.

## Validação automatizada

`pnpm test` foi concluído com **240 testes aprovados** e 3 ignorados; `pnpm typecheck` e `pnpm build` também foram aprovados.
