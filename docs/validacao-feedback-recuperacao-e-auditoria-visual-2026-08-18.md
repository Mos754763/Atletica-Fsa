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

### Correção reforçada — commit `5e6bbe0`

O commit `5e6bbe0` reforça a composição do `main.store-page` em modo escuro, removendo propriedades que poderiam manter uma camada invisível (opacidade, filtro, recorte, transformação, isolamento e `content-visibility`) e fixa a visibilidade explícita dos blocos da vitrine. A suíte local concluiu com **116 testes aprovados** e **3 ignorados intencionalmente**; o build de produção terminou com sucesso, apenas com avisos preexistentes do Autoprefixer. O deployment de Production foi iniciado na Vercel e estava em **Building** aos 27 segundos da primeira inspeção.

Uma navegação direta à URL gerada e uma alternância para o modo escuro ocorreram enquanto a Vercel ainda indicava **Building**. Como esse estado pode apresentar artefatos de versão/cache do deployment anterior, o resultado visual dessa tentativa não é conclusivo e a confirmação só será registrada após a transição para **Ready**.

Após o deployment ficar **Ready**, a validação no domínio canônico ainda exibiu a árvore interativa da vitrine sem a camada gráfica dos seus conteúdos no modo escuro. A investigação identificou uma causa específica: o seletor global que eleva filhos diretos de `body` a `z-index: 1` também atingia `.frontend-fx`. Isso anulava o `z-index: -1` definido para a camada de efeitos e podia colocá-la sobre uma rota da aplicação. A correção subsequente exclui explicitamente `.frontend-fx` desse seletor e fixa sua posição no plano de fundo.

No deployment do commit `933c252`, a vitrine continua estruturalmente acessível após ativar o modo escuro — os controles, os produtos e as ações permanecem presentes na árvore de acessibilidade —, mas sua apresentação visual ainda está coberta por um plano uniforme. Como a camada de efeitos já foi rebaixada, esta evidência indica que há uma segunda causa de composição ou de cascata a ser isolada antes de considerar a correção concluída.

Como medida de contenção focada em legibilidade, a próxima correção desativa no tema escuro as camadas exclusivamente decorativas `ambient-scene` e `frontend-fx`. A vitrine conserva o tema, os controles e os componentes funcionais, eliminando planos de fundo com composição independente até que uma implementação de efeitos escuros possa ser reintroduzida com isolamento visual validado.

### Publicação da contenção

O commit `63b22ba` — `fix: prevent dark storefront visual overlay` — foi enviado para `main`. Ele preserva a regra de empilhamento da aplicação e, no tema escuro, remove apenas as duas camadas decorativas que não participam da navegação ou da compra. A alteração foi coberta pelo teste de regressão de tema; a suíte retornou **118 testes aprovados**, com **3 testes intencionalmente ignorados**, e o build de produção terminou com sucesso. Os avisos existentes do Autoprefixer sobre `start`/`end` em CSS não interromperam a compilação.

No painel da Vercel, o deployment de Production de `63b22ba` foi iniciado normalmente e encontrava-se em **Building** aos 60 segundos. O deployment anterior (`933c252`) permanecia **Ready**; a aceitação visual será repetida exclusivamente quando `63b22ba` estiver em **Ready**.

Após cerca de três minutos, o status de `63b22ba` ainda era **Building**, acima do tempo observado nos deploys imediatamente anteriores. A publicação não indicava falha; a verificação continua pendente de seu estado final, sem qualquer alteração de configuração, dados ou pagamentos de Production.

### Resultado da tentativa de contenção

A URL do deployment `63b22ba` já respondeu com a vitrine completa em modo claro. Porém, ao alternar para o modo escuro, os elementos continuaram presentes e navegáveis na árvore de acessibilidade, enquanto os textos, imagens e superfícies de interface não eram desenhados sobre o fundo. Portanto, a remoção das camadas decorativas não resolve a causa raiz; a investigação passa a medir estilos computados e a identificar qual regra ou comportamento de renderização suprime a pintura dos descendentes em modo escuro.

### Causa raiz identificada

O contêiner `.store-cart` é um painel fixo que ocupa toda a viewport mesmo quando fechado. No modo escuro, uma regra genérica de superfícies atribuiu `background-color:#121e32` ao contêiner — em vez de somente ao painel interno — criando uma lâmina opaca acima da vitrine. A correção mantém o invólucro transparente em modo escuro; o fundo permanece aplicado apenas em `.store-cart__panel` quando o carrinho é aberto. Foi incluído um teste de regressão estático para a regra específica.

O commit `40c8157` (`fix: prevent closed cart overlay in dark storefront`) foi enviado à branch `main`. A suíte foi aprovada com **119 testes** e **3 skips intencionais**, e o build de Production concluiu com sucesso. Às 20:55, a Vercel registrava o deployment de Production correspondente em **Building** (24 segundos); a validação visual definitiva deve usar a URL associada a esse commit após o status **Ready**.

### Validação de aceitação — aprovada

O deployment `40c8157` ficou disponível na URL `https://atletica-1pcwulj28-moises-faustino-rodrigues-s-projects.vercel.app`. Na rota `/loja`, a alternância para o modo escuro preservou a renderização do cabeçalho, da navegação, do hero, dos filtros, das seis vitrines de produto e de suas imagens. O botão **Ver carrinho** também abriu corretamente o drawer em modo escuro: o backdrop escureceu somente a área externa e o painel lateral apresentou título, estado vazio, instrução e ação de retorno visíveis. A falha de cobertura total da vitrine está, portanto, corrigida na publicação do commit `40c8157`.

### Auditoria pública — landing

Na landing de Production (`atleticafsa.site`), o cabeçalho, os CTAs de loja e eventos, o hero institucional, o mascote, a navegação por seções, a vitrine resumida, a agenda e o rodapé permaneceram navegáveis e legíveis no viewport desktop. A alternância de tema também atualizou a interface sem conteúdo invisível. A continuidade da auditoria cobre eventos, login e a versão mobile destas rotas.

Na rota pública de eventos, a apresentação em modo escuro manteve logo, ação de retorno, título, descrição, ilustração, estado vazio e CTA de criação de conta com contraste suficiente. No momento da auditoria, a lista informa corretamente que não há evento publicado; a cobertura dos estados com ingressos exige a publicação de ao menos um evento de homologação.

No modo claro, a página de eventos preservou suas ações e mensagem de estado vazio. A tela de login em Production também apresentou composição equilibrada: painel institucional, formulário de e-mail e senha, entrada Google, CTA de acesso, criação de conta, recuperação de senha e seletor de tema visíveis, com campos devidamente rotulados.

Em modo escuro, o painel de acesso preservou a hierarquia dos campos, o botão Google, a chamada principal, os links secundários e o botão de entrada sem perda de interatividade ou corte visual. A próxima validação de recuperação exige um novo token de e-mail, pois ele é de uso único e expira.

## Auditoria responsiva complementar

Uma medição de layout com viewport CSS de **390 × 844 px**, em tema escuro, identificou dois estouros horizontais que não eram aparentes na auditoria desktop: a rota `/redefinir-senha` mantinha uma segunda coluna mínima de 470 px, e a transformação do drawer fechado da loja ampliava a largura rolável do documento.

As correções ajustam a grade da recuperação para uma única coluna abaixo de 780 px e aplicam contenção horizontal apenas quando a vitrine está presente. A medição local posterior confirmou `scrollWidth = clientWidth = 375 px` em `/loja` e `/redefinir-senha`; o drawer permanece fechado sem deslocar o documento e o grid da recuperação passa a uma coluna de 375 px. A suíte Vitest concluiu com **120 testes aprovados** e **3 skips intencionais**, e o build de Production terminou sem erro bloqueante. O commit `006057c` (`fix: prevent mobile overflow in store and password reset`) foi enviado para `main`; sua publicação de Production estava em **Building** aos 59 segundos e aguardava a validação no deployment final.

Na checagem subsequente, a publicação `006057c` permaneceu em **Building** por aproximadamente 2 minutos e 55 segundos, embora as publicações anteriores do mesmo projeto tenham concluído em cerca de 45–50 segundos. O build local havia sido concluído, portanto o atraso foi registrado como condição da infraestrutura de publicação a monitorar, sem qualquer alteração em dados de produção ou no bloqueio `PAYMENTS_ENABLED=false`.

Apesar do status ainda em sincronização no painel, a URL direta associada ao deployment `atletica-dopvpva2v-moises-faustino-rodrigues-s-projects.vercel.app` respondeu com a vitrine completa. A validação manual no navegador confirmou o catálogo, cabeçalho, filtros, navegação de eventos e controle de carrinho em modo claro; depois da alternância para escuro, o hero, os filtros, as imagens de produto e o controle do carrinho continuaram legíveis e visíveis. Essa evidência confirma a remoção da sobreposição opaca; permanece apenas a confirmação de estado **Ready** no painel.

Na nova consulta ao painel, a página de deployments abriu sem a lista renderizada no primeiro carregamento. Como a URL direta continuava servindo o deployment com a correção, a confirmação visual da interface foi preservada e a consulta ao status seria repetida após o carregamento do painel.

Na consulta final ao painel da Vercel, o deployment de Production do commit `006057c` foi confirmado como **Ready** (47 s). Assim, a correção responsiva da vitrine e da redefinição de senha está publicada em Production, com validação local de largura móvel, build concluído, testes automatizados aprovados e validação manual da vitrine nos modos claro e escuro.

## Validação humana de recuperação de senha — concluída

Em 18 de agosto de 2026, o administrador confirmou o fluxo completo diretamente no domínio canônico `atleticafsa.site`. As evidências enviadas mostram: a tela de sucesso **“Tudo certo. Sua senha foi atualizada.”**, com o aviso de segurança e as ações **“Ir para minha conta”** e **“Explorar a loja”**; em seguida, a rota `/conta` aberta em sessão autenticada, exibindo a área administrativa e os acessos ao ERP e ao ODS. Dessa forma, foram confirmados o callback de recuperação, a atualização de senha, a criação/preservação da sessão e o acesso subsequente à conta.

## Limite da validação humana

O único trecho que exige intervenção do administrador é a confirmação real de um novo e-mail de recuperação, seguida da escolha privada de senha. Nenhuma senha será solicitada, armazenada ou informada no registro técnico.
