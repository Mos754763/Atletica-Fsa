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
