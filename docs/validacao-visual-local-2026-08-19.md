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

## Isolamento de homologação

Foi criado o Preview da branch `homolog/member-interest-qa-20260819` na Vercel, associado ao commit `37b0df1` e separado do deployment de produção. A abertura pela sessão autenticada confirmou que a landing é renderizada no Preview.

Uma revisão completa da lista de variáveis confirmou entradas independentes de `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` para **Preview**, além das entradas de Production. Nenhuma variável foi criada, alterada ou copiada durante a revisão. Com essa separação e `PAYMENTS_ENABLED` configurado para Preview, o teste de cadastro pode avançar, desde que a submissão seja identificada como QA e suas evidências sejam mantidas no ambiente de homologação.

## Continuação de homologação — Preview isolado

- Preview testado: `https://atletica-fsa-git-ho-a4acdd-moises-faustino-rodrigues-s-projects.vercel.app/`.
- O projeto Supabase aberto no painel foi `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`), diferente do projeto de produção.
- A página pública do Preview respondeu e expôs a seção `#participar`, incluindo consentimento LGPD, seleção de setores e botão de submissão.
- A tela Vercel confirmou valores independentes das três variáveis Supabase em Preview e Production; nenhuma variável nem segredo foi revelado, criado ou modificado na sequência de validação.
- A navegação direta para `#participar` confirmou visualmente o formulário no Preview, incluindo área de relato opcional, checkbox de consentimento e botão `Quero participar`. A submissão ainda não foi realizada nesta etapa.
- A inspeção dos controles inferiores confirmou as seis opções de setor, o limite comunicado de até quatro escolhas, o campo opcional de relato e o consentimento obrigatório. Os campos superiores ainda serão preenchidos antes da submissão de QA.
- O formulário também disponibiliza campos opcionais de curso e período; eles serão usados somente para ampliar a cobertura do cenário sintético, sem vincular nenhuma pessoa real ao teste.
- A etapa de inspeção confirmou os campos de e-mail obrigatório e WhatsApp opcional. O formulário seguirá com e-mail de domínio `.test`, dados declaradamente sintéticos e uma seleção de setor, preservando dados pessoais reais fora da homologação.
- O preenchimento de nome e e-mail de QA foi iniciado no Preview. O navegador reposicionou a área visível após o foco do campo, mas a página permaneceu no mesmo formulário e nenhuma submissão ocorreu.
- O cenário de QA foi preenchido exclusivamente com dados sintéticos: nome `QA Interesse FSA 2026`, e-mail não entregável no domínio `.test`, telefone zerado, curso `Administração de Teste` e período `3º período`. Nenhum dado pessoal real foi usado e nenhuma submissão ocorreu até este ponto.
- No Preview de homologação, foi selecionado o setor Esportes e registrado o consentimento antes da submissão única autorizada. A interface exibiu: `Não foi possível registrar seu interesse agora. Tente novamente em alguns instantes.` Os campos foram limpos após a tentativa. O teste não deve ser repetido antes de identificar a causa nos logs; não há evidência de um registro criado.
