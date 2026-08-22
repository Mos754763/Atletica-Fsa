# Validação visual de imagens em Production — 2026-08-22

## Evidência de landing

A landing pública `https://atleticafsa.site/` foi aberta após a publicação do commit `9902369ca74733ac8fc74d25aa9027b40132c910` (`fix(media): restore and optimize sector imagery`). A imagem institucional do hero foi renderizada corretamente, com o mascote FSA íntegro, cores azul/amarelo preservadas, enquadramento completo e contraste adequado com os CTAs e a tipografia.

| Item verificado | Resultado |
| --- | --- |
| Hero do mascote | Renderizado sem corte, distorção ou quebra visual observável. |
| Navegação e CTAs acima da dobra | Presentes e legíveis sobre o fundo institucional. |
| Resposta da landing | Conteúdo estrutural e seções de setores, gestão, loja e eventos entregues pela rota pública. |
| Deployment avaliado | `dpl_EQdHvYnbt5FRrEMz3gL29eBH5bMy`, estado `READY`, Production. |

Uma tentativa de rolagem automatizada não moveu o viewport do navegador conectado; isso não produziu erro da aplicação e não invalida a renderização observada acima da dobra. A inspeção das seções será continuada por URLs com âncora e rotas próprias.

## Evidência da seção de setores

A navegação direta para `/#setores` carregou a seção institucional correspondente e exibiu a estrutura dos cinco cartões de Suprimentos, Eventos, Sociais, Marketing e Esportes. O navegador conectado registrou o deslocamento para a âncora e continuou a entregar o conteúdo da landing sem erro de rota. A segunda tentativa de rolagem atualizou a posição do documento, embora a captura de imagem do navegador tenha falhado no transporte; por esse motivo, a confirmação visual detalhada dos cards será complementada por validação HTTP dos URLs WebP publicados e pelas rotas independentes de loja e eventos.

## Evidência da loja pública

A rota `https://atleticafsa.site/loja` respondeu e renderizou a estrutura integral da vitrine: hero, navegação, filtros e seis cards de produtos. O hero institucional e o card da Camiseta Oficial FSA mostraram imagem visível. Entretanto, os cards do Chaveiro Coelho FSA, Copo FSA e Moletom Titular FSA apresentaram área de imagem vazia no viewport inspecionado, embora os textos, preços e estados de disponibilidade tenham sido entregues normalmente.

| Produto | Estado visual observado | Tratamento necessário |
| --- | --- | --- |
| Chaveiro Coelho FSA | Imagem ausente | Investigar URL de mídia e fornecer fallback visual sem modificar catálogo, preço ou estoque. |
| Copo FSA | Imagem ausente | Investigar URL de mídia e fornecer fallback visual sem modificar catálogo, preço ou estoque. |
| Moletom Titular FSA | Imagem ausente | Investigar URL de mídia e fornecer fallback visual sem modificar catálogo, preço ou estoque. |
| Camiseta Oficial FSA | Imagem renderizada | Sem ação corretiva. |

O achado é uma inconsistência visual pontual de mídia na loja, não uma falha de rota ou de dados comerciais. Nenhum preço, estoque ou dado de produto será alterado como parte da correção.

## Revalidação após a restauração de mídia

Após a publicação dos objetos WebP no bucket público `catalog-assets`, a repetição da inspeção em Production confirmou as imagens visíveis de **Chaveiro Coelho FSA**, **Copo FSA**, **Moletom Titular FSA** e **Camiseta Oficial FSA** nos respectivos cards. Os PNGs anteriormente cadastrados tinham entre 0,92 MB e 1,32 MB; as versões WebP equivalentes têm entre 12 KB e 35 KB, sem recorte, redimensionamento ou mudança de composição. A imagem de fallback para **Figurinhas FSA** também foi publicada e será confirmada após o deployment do commit que atualiza os URLs institucionais.

Na checagem posterior ao deployment de fallback, a página continuou a exibir áreas vazias em cards cujo registro de catálogo ainda contém URL legado. A causa foi isolada no resolvedor: ele priorizava qualquer URL persistida, mesmo quando a URL referia objeto legado indisponível, impedindo o uso do WebP publicado. Os cinco WebPs do catálogo responderam publicamente com `image/webp` e tamanhos entre 12.384 e 35.264 bytes; a correção definitiva deve priorizar os ativos institucionais por nome conhecido e manter a URL persistida apenas para produtos não mapeados.

O arquivo institucional do hero da loja, `fsa-hero-gestao-2026.png`, respondeu HTTP 200 (`image/png`, 1.077.743 bytes). A ausência transitória do mascote no screenshot da loja, portanto, não indica objeto ausente no Storage; será tratada separadamente por validação de renderização sem substituir o ativo ou alterar sua composição.

Na repetição com a página estabilizada em `https://atleticafsa.site/loja`, o hero carregou a arte completa do mascote e os quatro cards em destaque exibiram corretamente **Chaveiro Coelho FSA**, **Copo FSA**, **Moletom Titular FSA** e **Camiseta Oficial FSA**. O carregamento adiado dos cards fora da dobra preservou a composição e não produziu área vazia após os elementos entrarem na viewport. Não foi necessário substituir o ativo institucional do hero nem alterar dados de produto, preço ou estoque.

Em `https://atleticafsa.site/eventos`, a identidade visual de agenda foi renderizada por completo: marca FSA, tipografia, ícone de ingresso e tratamento de fundo apareceram sem imagem quebrada. A rota apresenta corretamente o estado vazio informado — não há eventos publicados —, portanto não existem imagens de capa de evento para auditar nesse momento.

Na inspeção inicial da rota `/login`, o asset de hero geral estava disponível, porém o recorte circular com `object-position: 77% center` privilegiava o disco amarelo em vez de mostrar o coelho. O Storage institucional contém o arquivo dedicado `catalog-assets/institutional/fsa-rabbit-mascot.png`; ele será usado na composição de autenticação para manter o mascote visível sem gerar, alterar ou recortar a arte original.

## Revalidação do login após a correção do mascote

O arquivo dedicado `fsa-rabbit-mascot.png` foi conferido diretamente no Storage público: respondeu HTTP 200, declarou `image/png` e mostrou o coelho com tapa-olho e uniforme FSA completo, sem distorção. A primeira substituição do asset foi publicada no commit `d41efa326c3c6498f3a32af448d26a901706ac0e`, mas a inspeção de produção identificou que a coluna visual do login era esticada pela altura do formulário e posicionava o mascote abaixo da dobra.

A correção subsequente definiu a coluna institucional com `align-self: start`, preservando a altura do viewport e a posição absoluta do círculo. A validação visual da implantação `dpl_AbWgcH6r583QobBH2YAW4iG6TKBK`, estado `READY`, confirmou o mascote dedicado visível dentro do primeiro viewport do login, com o rosto, o tapa-olho e as orelhas enquadrados no círculo. A identidade de fundo, o disco amarelo, a tipografia e todos os controles de autenticação permaneceram legíveis e funcionais na mesma captura.

| Verificação | Resultado |
| --- | --- |
| Asset do mascote | URL institucional pública disponível, HTTP 200 e composição vertical íntegra. |
| Login em produção | Mascote visível no primeiro viewport; não há mais exibição apenas do disco amarelo. |
| Controles de autenticação | Google, e-mail, senha, criação de conta, redefinição de senha e alternância de tema presentes. |
| Implantação avaliada | `dpl_AbWgcH6r583QobBH2YAW4iG6TKBK`, Production, commit `474b927bb755167b29e69c1877defe0624d5debb`. |

## Verificação das rotas operacionais e de recuperação

A rota autenticada `https://atleticafsa.site/erp` redirecionou corretamente para `/admin` e exibiu o mascote retrato completo no cabeçalho do painel, em modo escuro. A arte permaneceu proporcional, sem corte ou imagem quebrada, e não interferiu com o atalho de conta, KPIs, navegação lateral ou cartões de módulos. Essa evidência confirma que a atualização do componente compartilhado preservou o uso no ERP.

A rota pública `https://atleticafsa.site/redefinir-senha` apresentou sua composição própria de acesso protegido: marca FSA, tratamento visual azul/amarelo e formulário de nova senha com confirmação. A tela não usa uma imagem de mascote e não apresentou imagem ausente, distorcida ou sobreposta; os campos e o CTA permaneceram legíveis no primeiro viewport.

| Rota | Resultado visual final | Observação |
| --- | --- | --- |
| `/login` | Aprovada | Retrato oficial do coelho no primeiro viewport, com os controles de autenticação preservados. |
| `/erp` → `/admin` | Aprovada | Mascote completo e proporcional no cabeçalho operacional; nenhum impacto observado na navegação ou nos indicadores. |
| `/redefinir-senha` | Aprovada | Não utiliza mascote; fundo, marca, campos e CTA renderizados sem quebra de mídia. |

Com as verificações anteriores da landing, setores, loja e eventos, a auditoria de imagens das rotas relevantes foi concluída. As otimizações aplicadas limitaram-se a formatos e referências estáveis de Storage; nenhum preço, estoque, evento, cadastro comercial ou configuração de `PAYMENTS_ENABLED` foi alterado.

## Ajuste posterior de composição do login

Em 22 de agosto de 2026, uma prévia local do build de produção confirmou a atualização solicitada para o login: o retrato do coelho passou a ser servido por `institutional/fsa-rabbit-mascot-transparent.png`, com canal alfa e sem o antigo círculo verde. A composição foi reduzida para uma altura de viewport no desktop; logo, manchete, texto de apoio, mascote integral e todos os controles de autenticação permaneceram visíveis sem rolagem vertical. Em telas menores, a página volta a permitir altura automática para que nenhum campo, retorno de erro ou ação seja ocultado.

A implantação de produção `dpl_5psnpKbcxsfn7VZtuo7fopLmJfXP` (commit `73f58c5`) foi aprovada pela CI e confirmou a composição completa no URL de implantação. A segunda leitura estabilizada no domínio principal `https://atleticafsa.site/login` confirmou a mesma composição: mascote integral com fundo transparente, cartão completo no primeiro viewport e `Pixels below viewport: 0` na inspeção desktop. Portanto, não houve regressão de cache, rolagem ou enquadramento no domínio público.

## Inspeção responsiva móvel do login

Foram capturados os viewports de **390 × 844 px** e **360 × 800 px** após a conclusão da animação de entrada. Em ambos os formatos, a marca, os elementos decorativos, o título, a descrição e o mascote ficaram proporcionais e dentro das bordas. O cartão de acesso permaneceu centralizado, com largura consistente e sem corte horizontal. A rolagem vertical em celular é intencional: ela mantém todos os controles de autenticação acessíveis quando a altura disponível é menor que a composição completa.

| Verificação | 390 × 844 px | 360 × 800 px |
| --- | --- | --- |
| Marca, título e descrição | Alinhados e legíveis | Alinhados e legíveis |
| Mascote transparente | Integral e sem vazamento lateral | Integral e sem vazamento lateral |
| Cartão de acesso | Centralizado, sem corte horizontal | Centralizado, sem corte horizontal |
| Ponto preventivo | Acionador de tema próximo à borda do cartão | Acionador de tema sobre a área textual inferior do cartão |

O único ajuste preventivo pendente é reposicionar o ponto inicial do acionador móvel de tema para uma zona vazia. Isso preserva a possibilidade de o usuário movê-lo, sem sobrepor texto ou controles do fluxo de acesso.

Após a primeira tentativa de reposicionamento por media query, as capturas locais atualizadas de 390 × 844 px e 360 × 800 px demonstraram que o acionador continuou obedecendo uma coordenada controlada pelo componente e permaneceu junto ao cartão. Portanto, a correção deve ser aplicada na origem dessa coordenada, não apenas no CSS; a largura, a tipografia, o mascote e o cartão continuam alinhados e sem corte horizontal.

A correção foi então aplicada no componente `ThemeToggle`: em viewport de até 640 px, a posição inicial passa a ser o canto superior direito do hero, enquanto uma coordenada que o usuário já tenha arrastado continua preservada. As capturas finais em 390 × 844 px e 360 × 800 px confirmaram que o acionador permanece em área decorativa livre, sem sobrepor texto, mascote, campos ou o botão de Google. O login manteve alinhamento, legibilidade e ausência de corte horizontal nas duas larguras validadas.

Na verificação posterior diretamente no deployment de produção `dpl_BF3YYUrCbatSLBHDAMJ5hnezcCBu`, as larguras de 390 × 844 px e 360 × 800 px preservaram a marca, o acionador de tema e o formulário sem corte horizontal. Contudo, o mascote ainda avança sobre a borda direita da frase descritiva do hero nesses tamanhos. A composição precisa de um ajuste adicional de posição ou escala do mascote para reservar uma área totalmente livre para a cópia institucional no mobile.

O ajuste final reservou uma largura explícita da cópia proporcional ao espaço ocupado pelo mascote e, na faixa de até 420 px, moveu o mascote para a base do hero. As capturas locais pós-build em **390 × 844 px** e **360 × 800 px** confirmaram que a descrição agora quebra apenas dentro de sua própria coluna, com todas as palavras legíveis e sem qualquer avanço do mascote sobre o texto. A marca, o acionador de tema, o título, a ilustração, o cartão e a rolagem natural do formulário também permaneceram alinhados, dentro das bordas e sem corte horizontal.
