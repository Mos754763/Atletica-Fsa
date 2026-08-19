# Validação visual local — 2026-08-19

## Evidência

Foram capturadas duas imagens da rota local `/` em `http://127.0.0.1:3003/`, com Chromium headless em viewport de `1440 × 1000` e uma segunda tentativa com orçamento virtual de seis segundos. Ambas renderizaram o HTML e a imagem institucional, mas não aplicaram a folha de estilos esperada: links surgiram com estilo padrão do navegador e a estrutura do hero não recebeu os tokens/layouts CSS.

## Conclusão

Esta captura não é adequada para aprovar a inspeção visual das mudanças de alinhamento. A validação de build concluiu com sucesso e sem os avisos do Autoprefixer; porém, a instância local em execução aparenta estar com estado de desenvolvimento inadequado ou não entregando CSS ao navegador headless.

## Próxima ação

Antes de usar a inspeção visual como aceite, reiniciar a instância local, confirmar resposta HTTP de cada stylesheet referenciada pelo HTML e repetir as capturas. A homologação que grava dados permanece bloqueada até haver Preview isolado, mas a investigação de CSS local pode prosseguir sem alterar dados nem ambientes externos.

## Revalidação após reinício

Após reiniciar o Next.js local, a captura de `/` passou a aplicar corretamente os estilos e a landing exibiu o hero, navegação e faixa de destaque com alinhamento consistente. A página pública `/loja` também exibiu cabeçalho, filtros e cartões de produto sem regressão visual aparente.

Uma solicitação sem sessão a `/admin` redirecionou para a tela de login; portanto, a rota administrativa não foi exposta a um visitante não autenticado. A inspeção do conteúdo administrativo e da triagem só será feita depois da preparação da conta QA no Preview isolado.

## Validação móvel

As capturas em `390 × 844` de `/` e `/loja` preservaram o layout e os CTAs sem quebra do hero ou dos controles principais. Na loja, os filtros em categorias continuam roláveis horizontalmente, o que é compatível com a quantidade de opções; porém, o menu flutuante contextual fica visualmente próximo do primeiro cartão de produto. O comportamento deve ser reavaliado em uma revisão específica de UX, mas não foi introduzido pela normalização de `align-items` e não bloqueia a homologação funcional.
