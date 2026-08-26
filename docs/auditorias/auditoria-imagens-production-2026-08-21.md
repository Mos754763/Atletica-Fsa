# Auditoria de imagens em Production — 21/08/2026

## Evidências iniciais

| Escopo | Evidência observada | Situação inicial |
| --- | --- | --- |
| Páginas públicas capturadas | `/`, `/loja`, `/eventos`, `/login` e `/redefinir-senha` retornaram HTML de Production para análise. | Cobertura pública inicial concluída. |
| Ativos institucionais Supabase | O hero, fundos institucionais, selo e retratos da gestão respondem HTTP 200. | Íntegros no transporte. |
| Ativos de produto Supabase | As quatro imagens de catálogo seed respondem HTTP 200. | Íntegras no transporte. |
| Ativos apontados em `/manus-storage` | Os cinco cartões de setores e a imagem do produto de adesivos retornaram HTTP 404 quando requisitados no domínio público. | Falha confirmada; exige correção antes de qualquer compressão. |
| Inspeção visual do hero | A imagem do coelho foi carregada e exibida corretamente após o carregamento inicial da landing. | Íntegra; avaliar somente otimização de peso. |

## Regra de segurança da auditoria

Nenhum ativo visual será comprimido, convertido ou substituído enquanto existir uma falha de origem, URL ou exibição. A prioridade é restaurar a integridade de entrega; somente depois serão avaliadas otimizações que preservem proporção, transparência, identidade visual e comportamento responsivo.

## Inventário técnico dos ativos indisponíveis

Os seis arquivos recuperados localmente são PNGs sem transparência e estavam apontados para um caminho público inexistente. Os cinco banners setoriais têm proporção 16:9 (`1344 × 768`), e a arte de adesivos tem proporção vertical (`896 × 1152`). A soma local é de aproximadamente 5,76 MB, o que confirma oportunidade de conversão para um formato moderno sem recorte nem alteração criativa.

| Ativo | Dimensões | Peso PNG original | URL publicada antes da correção |
| --- | ---: | ---: | --- |
| `atletica-fsa-setor-suprimentos.png` | 1344 × 768 | 920.723 bytes | `/manus-storage/...` — HTTP 404 |
| `atletica-fsa-setor-eventos.png` | 1344 × 768 | 993.510 bytes | `/manus-storage/...` — HTTP 404 |
| `atletica-fsa-setor-social.png` | 1344 × 768 | 1.010.796 bytes | `/manus-storage/...` — HTTP 404 |
| `atletica-fsa-setor-marketing.png` | 1344 × 768 | 972.181 bytes | `/manus-storage/...` — HTTP 404 |
| `atletica-fsa-setor-esportes.png` | 1344 × 768 | 959.505 bytes | `/manus-storage/...` — HTTP 404 |
| `atletica-fsa-produto-adesivos.png` | 896 × 1152 | 898.924 bytes | `/manus-storage/...` — HTTP 404 |

Os ativos Supabase avaliados até o momento responderam HTTP 200. Os padrões institucionais PNG variam aproximadamente entre 0,92 MB e 1,20 MB cada, enquanto os retratos de gestão em WebP permanecem entre aproximadamente 30 KB e 98 KB por arquivo.

## Conversão segura validada

Foram geradas versões WebP com `quality=90`, sem redimensionamento, recorte, troca de enquadramento ou adição de conteúdo. A inspeção visual de duas amostras representativas confirmou a preservação do enquadramento, da paleta e dos elementos de marca: a arte vertical de adesivos manteve o mascote, escudo, megafone e bola; o banner horizontal de Eventos manteve o palco, a torcida, a iluminação azul e amarela e a bandeira da FSA.

| Grupo | Peso PNG de origem | Peso WebP gerado | Redução |
| --- | ---: | ---: | ---: |
| Produto de adesivos | 898.924 bytes | 38.654 bytes | 95,70% |
| Cinco banners de setores | 4.856.715 bytes | 336.456 bytes | 93,07% |
| Total dos seis ativos | 5.755.639 bytes | 375.110 bytes | 93,48% |

As dimensões foram preservadas em todos os arquivos: `896 × 1152` para adesivos e `1344 × 768` para os cinco banners de setores. A próxima etapa é publicar esses arquivos em Storage público estável, mudar somente as seis referências quebradas e validar as rotas em Preview e Production.
