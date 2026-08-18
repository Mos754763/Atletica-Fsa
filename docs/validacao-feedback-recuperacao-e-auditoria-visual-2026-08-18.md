# Validação do feedback de recuperação e auditoria visual — 2026-08-18

## Estado de publicação

O commit `31e44fb` (`feat: add password reset success confirmation`) foi enviado para a branch `main` e acionou um deployment de Production na Vercel. Em verificações sucessivas até aproximadamente quatro minutos após o push, o deployment ainda constava como **Building**. A URL direta observada para inspeção é `https://atletica-53q85iyxs-moises-faustino-rodrigues-s-projects.vercel.app/`. A validação pública do novo estado de sucesso deve começar somente após a transição para **Ready**.

Posteriormente, o commit `8eaec9e` (`fix: improve store theme defaults and dark contrast`) foi promovido para `main`. O build local concluiu sem erro bloqueante; no painel da Vercel, o deployment de Production correspondente permaneceu em `Building` durante a primeira inspeção, acima do tempo habitual observado para este projeto. A investigação seguirá pelo detalhe do deployment, sem alterar configurações nem reimplantar manualmente.

O deployment `8eaec9e` concluiu como **Ready** em 47 segundos. No domínio canônico `https://atleticafsa.site/loja`, uma nova sessão apresentou o modo claro como padrão e mostrou a navegação, filtros, vitrine e carrinho; as imagens começaram a renderizar conforme a página estabilizou.

Ao alternar manualmente o domínio canônico para o modo escuro, a vitrine permaneceu invisível mesmo após a estabilização da transição. Os elementos continuam disponíveis no DOM e acessíveis por teclado/leitor de tela, portanto a falha é visual (cores, sobreposição ou opacidade), não de carregamento de catálogo. O item continua bloqueado no checklist para uma correção específica antes da conclusão da auditoria visual.

## Garantias já verificadas localmente

- A suíte Vitest concluiu com **115 testes aprovados** e **3 testes intencionalmente ignorados**.
- O build Next.js compilou, validou tipos, gerou as páginas estáticas e finalizou a otimização de rotas sem erro bloqueante.
- A confirmação de sucesso mantém a sessão atual, informa que a senha foi atualizada, oferece os destinos `/conta?senha=atualizada` e `/loja`, e não altera pagamentos, dados, permissões ou callbacks.

## Verificação pública do deployment

- Mesmo enquanto o painel da Vercel ainda indicava `Building`, a URL direta do deployment respondeu com a landing page da ATLETICA FSA e os principais links públicos.
- A rota direta `/redefinir-senha` respondeu com os dois campos de senha e o botão de atualização, sem enviar e-mail nem alterar credenciais.
- A inspeção visual em tema escuro confirmou contraste legível entre cartão, título, texto auxiliar, rótulos, inputs e CTA amarelo.
- O fluxo de sucesso real permanece coberto por testes de unidade e build. A execução final que grava uma nova senha requer o link de recuperação de uso único e a definição privada da senha pelo administrador.

## Auditoria visual da loja

Durante a inspeção do Preview de Production em `https://atletica-53q85iyxs-moises-faustino-rodrigues-s-projects.vercel.app/loja`, o conteúdo semântico e os controles interativos da vitrine foram encontrados no HTML — navegação, filtros, seis produtos, carrinho e seletor de tema. Entretanto, no tema escuro o viewport exibiu apenas o fundo, sem a camada visual da loja. A ocorrência foi mantida no checklist como falha de visibilidade, e não como estado transitório de animação.

Na inspeção do deployment posterior em modo claro, a vitrine renderizou as imagens de produto, filtros, títulos, preços e CTA normalmente após a estabilização da página. Assim, a disponibilidade das imagens não é bloqueio geral; a correção deve preservar esse comportamento no claro e resolver especificamente o contraste/revelação no escuro.

### Revalidação do modo escuro — commit `ee9dd56`

No deployment `https://atletica-3uz32a542-moises-faustino-rodrigues-s-projects.vercel.app/loja`, os produtos e controles responderam corretamente em modo claro. Após a alternância para modo escuro, o fundo azul-marinho foi aplicado, mas marca, textos, filtros e cartões permaneceram visualmente invisíveis enquanto seguiam interativos. A regra de contraste adicionada anteriormente não eliminou a causa raiz; a investigação deve focar a camada de revelação/empilhamento aplicada após a transição de tema.

## Limite da validação humana

O único trecho que exige intervenção do administrador é a confirmação real de um novo e-mail de recuperação, seguida da escolha privada de senha. Nenhuma senha será solicitada, armazenada ou informada no registro técnico.
