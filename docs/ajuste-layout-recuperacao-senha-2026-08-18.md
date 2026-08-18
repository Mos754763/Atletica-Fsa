# Ajuste visual — recuperação de senha

## Objetivo

Refinar a composição da página `/redefinir-senha` após a validação funcional em Production, preservando o callback e a atualização de senha já confirmados.

## Ajustes implementados

- Foi criado um escopo visual exclusivo para a recuperação, com painel institucional reequilibrado, tipografia reduzida e elemento amarelo deslocado para não cobrir o título.
- O formulário passou a ter contêiner próprio, maior contraste, espaçamento uniforme e marcador visual amarelo.
- Foram incluídas regras específicas para desktop, largura intermediária e mobile, sem alterar o layout compartilhado do login.

## Validação local inicial

Em `2026-08-18`, a rota local respondeu com o novo conteúdo, porém os estilos globais não foram carregados pelo proxy temporário da porta `3003`. A validação visual definitiva deve ocorrer no Preview da Vercel após o build, que reproduz o carregamento real de assets.
