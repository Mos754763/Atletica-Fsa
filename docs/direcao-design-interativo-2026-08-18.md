# Direção de design interativo — ATLETICA FSA

## Referências analisadas

Foram observados os sites públicos [Bluecore](https://bluecore.com.br/) e [Lando Norris](https://landonorris.com/) em 18 de agosto de 2026. A proposta para a ATLETICA FSA será **original**: não reutilizará código, textos, composição literal, identidade ou ativos dessas referências.

| Referência | Princípios úteis observados | Tradução original para a ATLETICA FSA |
| --- | --- | --- |
| Bluecore | Hero com mensagem curta e dominante, navegação direta, narrativa modular, cartões por categoria, estados de interface tratados como parte do sistema | Manifesto esportivo no hero, atalhos claros para loja, eventos e acesso; módulos institucionais com contraste azul, amarelo, branco e preto |
| Lando Norris | Abertura imersiva, tipografia em escala alta, transições por rolagem, objetos em camadas e alternância entre narrativa e coleções | Cena gráfica inspirada em arquibancada e quadra, mascote e produtos em profundidade moderada, trilha de eventos e vitrine como capítulos da mesma página |

## Direção proposta

> **“Ritmo de torcida, clareza de operação.”** A experiência deve ter energia no movimento, mas preservar decisões de compra, inscrição e autenticação inequívocas.

1. **Camadas visuais com propósito.** Fundos usarão partículas vetoriais leves, faixas de torcida e formas do universo FSA; nenhum efeito deve cobrir controles, degradar contraste ou bloquear cliques.
2. **3D perceptivo, não pesado.** Profundidade será produzida com transformações 2.5D, perspectiva CSS e parallax por `requestAnimationFrame`. Não haverá dependência obrigatória de WebGL para comprar, navegar ou autenticar.
3. **Cursor responsivo com degradação segura.** Um halo discreto seguirá ponteiros precisos, reagirá a CTAs e será desativado para toque, `prefers-reduced-motion` e navegação por teclado.
4. **Scroll como narrativa.** Entradas de seção, máscaras de imagem e deslocamentos de objetos usarão apenas `transform` e `opacity`, Intersection Observer e propriedades CSS; o conteúdo continuará legível antes da animação e sem JavaScript.
5. **Carrosséis inclusivos.** Produtos, campanhas e eventos terão botões anteriores/próximos, indicadores, teclas direcionais, pausa automática em foco ou hover e marcação semântica. A rolagem automática será opcional e interrompida sob movimento reduzido.
6. **Interações táteis.** Cartões, produtos e CTAs terão resposta de hover/pressão curta, com foco visível e equivalência por teclado. Animações frequentes permanecem abaixo de 300 ms.
7. **Performance e comércio primeiro.** Fotos usarão os assets já publicados, carregamento preguiçoso, tamanhos responsivos e reserva de espaço. Carrinho, filtros, checkout, autenticação e rotas públicas serão preservados.

## Critérios de aceite

| Critério | Evidência esperada |
| --- | --- |
| Originalidade | Uso exclusivo da linguagem FSA, seus próprios textos, cores e ativos |
| Acessibilidade | Foco de teclado, contraste, redução de movimento e conteúdo visível sem script |
| Compatibilidade | Controles de compra, carrinho, autenticação e eventos funcionam sem regressão |
| Desempenho | Sem animação de layout; efeitos condicionais em dispositivos de toque e movimento reduzido |
| Responsividade | Sem overflow horizontal em 390 px, 768 px e desktop; interação por toque preservada |

## Validação de composição e ativo editorial

Foi construída uma primeira versão da landing com hierarquia tipográfica editorial, cursores magnéticos, parallax limitado à propriedade `transform`, órbitas de profundidade e uma faixa cinética. A prévia local confirmou que a composição, as camadas e os controles permanecem visíveis após o período de animação. Uma ilustração editorial original do mascote foi gerada e enviada ao armazenamento persistente no caminho `/manus-storage/atletica-fsa-hero-rabbit-editorial_0ef669d1.png`.

> A rota local do Next.js não expõe os caminhos `/manus-storage`, por isso a prévia de desenvolvimento exibe o texto alternativo desse ativo. O componente do herói recebeu fallback explícito para a arte institucional caso qualquer entrega de imagem falhe. A validação visual definitiva do novo ativo deve ocorrer na URL de deployment, onde o armazenamento persistente é servido.

## Validação da vitrine interativa

A prévia local da rota `/loja`, em desktop, confirmou a integração dos cartões com profundidade controlada, imagem consistente, indicação de categoria, título, descrição, preço e disponibilidade. A correção posterior tornou a categoria e o título elementos de bloco independentes, eliminando a sobreposição tipográfica observada durante a revisão. Os atalhos de navegação, filtros, acesso ao carrinho e estados indisponíveis permaneceram visíveis e operáveis.

## Evidência de publicação e correção do ativo

Em 18 de agosto de 2026, a implantação de Production do commit `a88c8af` respondeu na URL temporária `https://atletica-4qakklwtj-moises-faustino-rodrigues-s-projects.vercel.app/`. A composição, a barra de progresso e as órbitas do hero foram carregadas, mas a ilustração em `/manus-storage/atletica-fsa-hero-rabbit-editorial_0ef669d1.png` respondeu como imagem quebrada, exibindo o respectivo texto alternativo.

Como correção definitiva, foi criado um recorte transparente do mascote institucional, preservando tapa-olho, uniforme FSA, silhueta e elementos gráficos azul, amarelo e branco, e publicado no caminho persistente `/manus-storage/fsa-mascot-hero-transparent_508641e3.png`. A landing o utiliza como fonte primária com `catalog-assets/institutional/fsa-hero-gestao-2026.png` como fallback explícito. A suíte automatizada e o build de produção concluíram com êxito; a verificação visual final permanece vinculada à implantação do commit corretivo.

Na inspeção da implantação `bcc6a8a`, o navegador recebeu o texto alternativo do hero: o caminho interno `/manus-storage/` não foi servido como sub-recurso da implantação protegida, enquanto a URL pública do Supabase do asset institucional respondeu `200 image/png`. A próxima correção usa estado React para tornar o fallback efetivo após `onError`, em vez de alterar apenas o atributo DOM de uma imagem controlada por animação, e integra o fundo escuro do asset à cena com blend mode. Essa alteração aguarda validação visual na nova implantação.

## Validação publicada final

A validação foi concluída no deployment `f35f8cf` em desktop. Landing, loja, eventos, login e recuperação permaneceram navegáveis, com contraste legível e controles de foco visíveis. A vitrine preservou a leitura entre categoria e título após a animação de entrada, bem como seus atalhos de carrinho e filtros.

A camada de movimento mantém contenção para `prefers-reduced-motion` e ponteiro grosseiro; a auditoria responsiva anterior em 390 px não identificou estouro horizontal. No domínio canônico, o HTML inicial contém os conteúdos essenciais da landing — manifesto, agenda e loja —, confirmando disponibilidade informacional sem depender de interação JavaScript. A URL técnica de deployment é protegida por SSO para requisições fora do navegador autenticado; por isso, a confirmação sem script foi feita no domínio público canônico.
