# Modo escuro da ATLETICA FSA

## Comportamento

O modo escuro está disponível em todas as áreas públicas, de conta e administrativas, inclusive ERP, catálogo, eventos, relatórios e ODS. O controle flutuante no canto inferior direito pode ser acionado por ponteiro, teclado ou tecnologias assistivas; o atributo `aria-pressed` informa o estado atual.

| Situação | Tema aplicado |
|---|---|
| Primeira visita sem preferência salva | Preferência escura ou clara do sistema operacional. |
| Escolha manual | A escolha é salva no navegador sob a chave `fsa-theme`. |
| Visitas posteriores | A escolha salva tem prioridade sobre a preferência do sistema. |
| Navegação entre páginas | O tema é mantido porque é aplicado no elemento `<html>` antes da hidratação. |

## Operação

Para alternar o tema, selecione o botão com ícone de lua ou sol no canto inferior direito. O tema é uma preferência do dispositivo e navegador, não uma configuração global da associação; portanto, cada usuário pode escolher o contraste que lhe for mais confortável.

Para restaurar a preferência automática do dispositivo em um navegador específico, remova a entrada `fsa-theme` do armazenamento local do domínio. Não há dado de conta, perfil ou informação operacional associado a essa preferência.

## Garantias implementadas

A inicialização ocorre antes da hidratação da aplicação, reduzindo o flash de tema claro em dispositivos configurados para escuro. As superfícies administrativas, cards, campos de formulário, catálogo, conta, eventos e relatórios recebem cores escuras próprias, mantendo amarelo como cor de ação e azul como cor de identidade. O ODS preserva seu contraste operacional escuro já existente.

## Validação desta entrega

Foram executados `git diff --check`, `pnpm typecheck`, `pnpm test` e `NODE_ENV=production pnpm build`. A suíte inclui testes para prioridade de preferência persistida, uso da preferência do sistema e descarte de valores inválidos. O build foi concluído com os avisos preexistentes do Autoprefixer sobre `start` e `end`, sem erro de compilação ou tipagem.
