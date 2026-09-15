# Plano — Carrossel 3D de diretores e enquadramento do mascote

## Objetivo

Evoluir a seção **“Quem move a FSA”** para um carrossel tridimensional editorial, com cartões de diretores em profundidade e navegação inclusiva. Em paralelo, corrigir o enquadramento do mascote no hero para que a ilustração fique plenamente legível e visualmente integrada ao círculo amarelo, sem moldura retangular, sem cortar o personagem e sem invadir o manifesto ou os CTAs.

## Diagnóstico atual

| Área | Estado observado | Implicação para a execução |
| --- | --- | --- |
| Gestão | O componente `ManagementCarousel` já tem índice ativo, autoavançar, pausa em hover/foco, botões, indicadores e teclado; porém exibe somente um painel plano por vez. | A evolução deve preservar a semântica e trocar apenas a composição visual e a lógica de posição dos cartões. |
| Hero | O mascote usa asset institucional público, fallback reativo, recorte elíptico e transformações 3D no ponteiro. O enquadramento atual ainda evidencia uma composição rígida no centro do círculo amarelo. | O ajuste deve ser feito no contêiner visual e na posição da imagem, sem alterar o fallback, o texto alternativo, as órbitas, a barra de progresso ou os links de conversão. |
| Acessibilidade | Há suporte existente a `prefers-reduced-motion`, foco, setas do teclado e modo de ponteiro grosseiro. | O carrossel 3D terá uma variante estática/reduzida; todas as ações continuarão disponíveis sem hover e por teclado. |

## Plano de implementação

### 1. Preparar o estado e a geometria do carrossel

Manter a fonte de dados de diretores existente e o índice ativo atual. Introduzir uma função determinística para classificar cada diretor como **ativo**, **anterior**, **próximo** ou **oculto**, calculando a distância circular ao índice selecionado. Essa classificação alimentará classes/atributos de estado, em vez de criar rotas ou estados paralelos.

O viewport receberá uma cena com `perspective` e preservação 3D. O cartão ativo será o único interativo e legível como conteúdo principal; os cartões vizinhos aparecerão parcialmente nas laterais, com escala menor, rotação Y oposta, profundidade negativa, opacidade reduzida e sem receber foco. Os cartões ocultos não ficarão expostos a leitores de tela ou ao tabulador.

| Posição | Composição proposta | Interação |
| --- | --- | --- |
| Ativa | Frente, escala integral, foto e nome completos, contraste máximo. | Conteúdo anunciado; pode receber foco. |
| Vizinha esquerda | Parcialmente visível, rotação Y positiva e profundidade reduzida. | Clique/tap seleciona o cartão; não entra na ordem de tabulação. |
| Vizinha direita | Parcialmente visível, rotação Y negativa e profundidade reduzida. | Clique/tap seleciona o cartão; não entra na ordem de tabulação. |
| Demais | Fora do viewport, invisíveis e inertes. | Sem foco e sem anúncio redundante. |

### 2. Preservar comportamento acessível e operacional

Preservar os controles anterior/próximo, indicadores com `role="tab"`, seleção ativa, setas esquerda/direita, pausa ao passar o mouse ou focar e o temporizador já existente. Adicionar rótulos que informem a posição do diretor selecionado e garantir que a troca de cartão não capture foco nem cause anúncio excessivo.

Em `prefers-reduced-motion`, telas pequenas e dispositivos de toque, a cena passará para uma apresentação unidimensional: cartão ativo plano, transição curta de opacidade e os mesmos controles explícitos. O autoavanço continuará desativado com movimento reduzido. Nenhuma ação de compra, eventos ou autenticação será alterada.

### 3. Construir o sistema visual 3D

Atualizar `experience.css` com uma cena isolada para a gestão. A implementação utilizará exclusivamente `transform`, `opacity` e `filter` para as transições, evitando animações de posição, largura, altura ou reflow. A fotografia será enquadrada dentro do cartão com `object-fit: cover`, mantendo rosto e uniforme no centro, e as camadas de texto manterão contraste sobre o azul FSA.

O design seguirá a identidade existente: azul profundo para o palco, amarelo como aresta/energia, branco para dados e tipografia editorial. A profundidade será moderada — percebida, mas não decorativa a ponto de dificultar a identificação das pessoas.

### 4. Reenquadrar o mascote do hero

Inspecionar a posição útil do mascote dentro do asset institucional público e substituir o recorte rígido aplicado diretamente à imagem por um **viewport dedicado ao mascote**. Esse viewport terá tamanho, raio e `overflow` controlados; a imagem interna será deslocada e escalada somente o necessário para preencher a área de foco, preservando o rosto, tapa-olho, uniforme e logotipo FSA.

O círculo amarelo e as órbitas continuarão como camadas de fundo. A imagem será renderizada acima delas com profundidade estável, sombra curta e contraste normal — sem blend mode que reduza a legibilidade. O fallback reativo permanecerá ativo e continuará apontando para a origem pública do Supabase; nenhum caminho local `/manus-storage/` será reintroduzido.

Critérios de enquadramento do hero:

1. O mascote deve ser integralmente identificável, com rosto e tapa-olho livres de corte.
2. A arte não pode exibir uma borda retangular perceptível.
3. O círculo amarelo deve atuar como moldura de energia, não como máscara que oculta a ilustração.
4. A composição deve manter distância clara do título, texto descritivo, botões e selo “2026”.
5. Em 390 px, o mascote deve permanecer centralizado, sem criar overflow horizontal nem bloquear CTAs.

### 5. Testar e validar visualmente

Ampliar `experience.css.test.ts` para cobrir: existência da cena 3D, classes/estados ativo-vizinho, controles atuais, degradação com movimento reduzido, ausência de ponteiros bloqueados e manutenção do fallback público do hero. Executar a suíte e o build de produção antes de versionar.

Após a publicação, validar no deployment: hero em desktop e 390 px; carrossel em desktop por mouse, clique e setas; foco visível; carrossel em movimento reduzido; e ausência de overflow. Registrar o resultado em `docs/direcao-design-interativo-2026-08-18.md` e no `todo.md` somente após as evidências de produção.

## Arquivos previstos

| Arquivo | Alteração planejada |
| --- | --- |
| `src/components/landing/ManagementCarousel.tsx` | Estado geométrico dos cartões, semântica do cartão ativo, seleção por clique e fallback reduzido. |
| `src/components/landing/LandingMotion.tsx` | Estrutura de viewport do mascote e posicionamento seguro da imagem/fallback. |
| `src/app/experience.css` | Cena 3D, composição lateral, responsividade e regras de enquadramento do hero. |
| `src/app/experience.css.test.ts` | Regressões de acessibilidade, degradação de movimento e composição visual segura. |
| `todo.md` e `docs/direcao-design-interativo-2026-08-18.md` | Critérios de aceite, evidências e conclusão após validação. |

## Critérios de aceite

| Critério | Resultado esperado |
| --- | --- |
| Carrossel 3D | Diretor ativo frontal, dois vizinhos laterais com profundidade e transições estáveis. |
| Inclusão | Navegação por botão, indicador, teclado e toque; foco e anúncios sem duplicação. |
| Responsividade | Uma coluna segura em mobile, sem cortes, overflow horizontal ou movimentos obrigatórios. |
| Mascote | Silhueta clara dentro da moldura circular, sem retângulo visível e sem perda do rosto/tapa-olho. |
| Integridade | Links, loja, eventos, autenticação, fallback de imagem e `PAYMENTS_ENABLED=false` permanecem inalterados. |
| Qualidade | Testes e build aprovados; validação visual no deployment antes de encerrar. |

## Premissas e riscos

As fotos e nomes atuais da gestão serão reutilizados; este escopo não exige geração de novos retratos. O tratamento do mascote será prioritariamente de composição CSS/React sobre o asset público já disponível. Caso o enquadramento revele que o asset não contém margem suficiente para preservar a silhueta, a alternativa será solicitar ou gerar um recorte transparente de alta qualidade, publicado em uma origem que seja efetivamente servida pela Vercel. Nenhuma alteração será feita em dados de Production, autenticação ou integrações de pagamento.

## Evidência de prévia local

Na prévia local em desktop, a cópia do hero, os CTAs e o mascote passaram a renderizar na primeira pintura. O mascote fica dentro de um viewport circular azul-escuro acima do orbe amarelo, sem interferir no manifesto ou nos links. A fonte de dados da gestão continua anunciando corretamente o integrante ativo e a sua posição, mantendo oito integrantes disponíveis para a cena 3D.

O hero preserva leitura de título, texto, ações e selo na dobra inicial. A inspeção da cena de diretores seguirá separadamente abaixo da faixa de capacidades, sem alterar os controles ou dados dos integrantes.

Durante a rolagem local, a faixa de capacidades e a seção de setores continuam com o conteúdo visível e sem sobreposição com o hero. A seção de diretores permanece abaixo dessas duas faixas; a validação dela exige alcançar a posição subsequente na mesma página.

A seção de setores foi verificada na prévia local sem regressão visual: as cinco frentes permanecem visíveis e não criam overflow. A cena de gestão aparece logo após esse bloco e será verificada especificamente quanto ao enquadramento dos retratos e à hierarquia ativo-vizinhos.

O cabeçalho de gestão preserva margem de respiro após a grade de setores, com título, descrição e link institucional legíveis. A próxima posição de rolagem contém a cena tridimensional propriamente dita, que será validada quanto à centralização e aos cartões laterais.

Na prévia local desktop, a cena mostra um cartão central de alto contraste, um cartão vizinho parcial à esquerda e uma pilha lateral à direita, todos dentro de um mesmo palco visual. Os controles anterior/próximo e os oito indicadores continuam presentes no DOM, com rótulos descritivos e `role="tab"`, enquanto o texto alternativo anuncia a integrante ativa e sua posição no conjunto.

Na implantação Ready `d4dd7c6` (`https://atletica-ar17wiera-moises-faustino-rodrigues-s-projects.vercel.app/`), o carrossel permanece disponível e o hero preserva os CTAs. A composição atual do mascote, porém, ainda mostra uma faixa inferior escura do asset institucional dentro do orbe. O próximo ajuste deve reutilizar apenas a região superior ilustrada sem alterar a estrutura semântica, os links ou a navegação do hero.

Na prévia local posterior, o enquadramento foi ampliado e deslocado para a região superior do asset. O mascote, suas orelhas, rosto, camiseta FSA e braços aparecem integralmente no viewport circular, sem a faixa inferior vazia; os CTAs continuam legíveis e não foram deslocados.

Na revisão final da cena 3D, os retratos ativos ficaram integralmente enquadrados no cartão central. Os cartões adjacentes permaneceram parcialmente visíveis em profundidade, sem competir com a leitura do nome e do cargo. O botão “Ver próximo integrante” avançou a cena de forma previsível, enquanto controles anteriores, indicadores e texto anunciável continuaram disponíveis.

No deployment `e5eef0e`, o hero foi confirmado com o mascote enquadrado acima do orbe amarelo, sem a faixa inferior do asset. Na mesma versão, a âncora `#gestao` preservou no documento a descrição, os oito integrantes e o anúncio do estado ativo, porém o palco dos cartões ficou visualmente vazio. A correção deve restaurar a primeira pintura da cena sem remover controles, indicadores ou a alternativa de movimento reduzido.

Após a correção de primeira pintura, a prévia local desktop foi revalidada em `#gestao`: o cartão ativo voltou a ser renderizado frontalmente, com retrato, nome e cargo legíveis; há cartões adjacentes parcialmente expostos nas duas laterais, preservando a sensação de profundidade. O autoavanço continuou atualizando o anúncio acessível de integrante e posição; os botões anterior/próximo e os oito indicadores `role="tab"` permaneceram disponíveis. A validação técnica associada concluiu com `pnpm test` (127 testes aprovados, 3 skips intencionais) e `pnpm build` aprovados, restando apenas os avisos preexistentes do Autoprefixer.

O domínio de produção `https://atleticafsa.site/` passou a responder após o envio do commit `179eb0f`. Na dobra inicial, o hero preservou o mascote circular acima do orbe amarelo, com rosto, tapa-olho, uniforme e CTAs visíveis; a seção Gestão continuou expondo no documento os controles e o anúncio do integrante ativo para a validação interativa subsequente.

Na navegação de produção até as faixas institucionais seguintes, a composição do hero permaneceu estável, sem overflow ou sobreposição dos CTAs, e o estado acessível do carrossel continuou progredindo entre integrantes. A inspeção visual do palco será concluída diretamente na seção Gestão antes de encerrar a publicação.

No percurso até a gestão, a faixa de capacidades e os cinco cartões de setores permaneceram legíveis e alinhados em desktop; não houve regressão visual nas transições entre hero, conteúdo institucional e seção seguinte. A cena de diretores continua sendo o ponto de aceite específico da publicação.

Na produção, o cabeçalho da seção Gestão foi alcançado sem cortes ou deslocamentos: título, descrição, vínculo institucional e o início do palco de cartões voltaram a aparecer na mesma composição observada localmente. A confirmação final do cartão frontal e das laterais será feita no próximo enquadramento do viewport.

No enquadramento completo em `https://atleticafsa.site/#gestao`, a falha visual foi resolvida: o cartão ativo foi exibido frontalmente, com foto, nome e cargo; um retrato adjacente ficou parcialmente visível à esquerda e os painéis laterais em profundidade foram preservados à direita. Os controles anterior/próximo e os oito indicadores permaneceram expostos, e o anúncio acessível identificou a posição do integrante no conjunto. A cena não está mais vazia em produção.

Na seleção direta pelo indicador de Rafa, a produção atualizou imediatamente o cartão frontal, o retrato e o anúncio para “Rafa, Presidente da Atlética, integrante 1 de 8”. A verificação de `ArrowRight` a partir desse indicador não alterou a seleção na sessão do navegador; a navegação por controles e indicadores permanece confirmada, enquanto a interação por setas deve ser conferida no elemento de foco previsto pelo componente antes de ser declarada como validada manualmente.

A conferência foi completada ao mover o foco para o viewport do carrossel, que possui `tabIndex={0}` e trata as teclas de seta. Com esse foco, `ArrowRight` alterou a cena de Rafa (1 de 8) para Bella (2 de 8), atualizando foto, nome, cargo e anúncio ao vivo. A navegação por teclado está validada em produção no ponto de foco previsto pelo componente.

Na revisão local posterior, o hero de entrada passou a apresentar o mascote com enquadramento ampliado, mantendo orelhas, rosto, tapa-olho, uniforme e braços dentro da composição circular. A indicação textual “Plataforma integrada” foi removida. A faixa amarela passou a conter duas sequências idênticas de destaques, animadas em uma esteira linear contínua e com alternativa estática para preferência de movimento reduzido. A rota `/loja` recebeu o mesmo mascote institucional no hero; após reiniciar a prévia local para renovar os recursos CSS do Next.js, a composição foi renderizada corretamente, mantendo tipografia, filtros, atalhos e cartões de produto visíveis.

A navegação inicial pela prévia local confirmou o hero e a loja já estilizados. Uma troca de âncora para a Gestão exibiu momentaneamente uma captura de transição sem o conteúdo do palco; a validação desse ponto deve ser repetida após a estabilização do navegador, sem concluir a aceitação apenas por essa captura intermediária.

As capturas posteriores do navegador continuaram alternando momentaneamente entre a âncora e a dobra inicial durante a rolagem programática. A marcação carregada confirma oito slides, um slide ativo com `opacity: 1` e `visibility: visible`, controles laterais com rótulos explícitos e o anúncio ao vivo do integrante. A aceitação visual definitiva do palco será feita depois do build, em uma sessão de produção estabilizada.

Após a publicação do commit `7e14aaf`, a produção em `https://atleticafsa.site/` confirmou: o selo “PLATAFORMA INTEGRADA” não está mais presente; a faixa inferior contém duas sequências consecutivas de JOGOS, FESTAS, CAMPEONATOS, TORCIDA e LOJA OFICIAL, garantindo a esteira contínua; e o hero mostra o mascote sem moldura retangular, com rosto, tapa-olho, uniforme e braços plenamente reconhecíveis dentro da composição circular. A rota pública `/loja` também carregou o mascote no hero e preservou navegação, filtros, cards de produto, carrinho e o drawer contextual.

A inspeção subsequente em produção mostrou a esteira em uma posição diferente da captura anterior e o anúncio do carrossel alterado de Rafa (01/08) para Bella (02/08), evidenciando a continuidade automática de ambos os movimentos sem ação manual. O conteúdo duplicado da esteira mantém a transição sem um intervalo visual vazio.

Uma inspeção direta do HTML publicado confirmou os dois controles laterais no carrossel: `people-carousel__arrow--previous` com `aria-label="Ver integrante anterior"` e `people-carousel__arrow--next` com `aria-label="Ver próximo integrante"`, ambos vinculados ao viewport `gestao-carousel-viewport`. Isso confirma a presença das setas na publicação, inclusive para leitores de tela e navegação por teclado.
