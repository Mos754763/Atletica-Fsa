# Auditoria de UI/UX — superfícies ATLETICA FSA

**Data:** 19 de agosto de 2026  
**Escopo:** landing, loja, ERP, ODS, eventos e backoffice.  
**Método:** inspeção da versão publicada, revisão de rotas e componentes, sem gerar imagens, ícones ou mascotes novos.

## Evidências iniciais da interface publicada

| Superfície | Evidência confirmada | Oportunidade priorizada |
|---|---|---|
| Landing | O hero apresenta navegação direta, CTAs de loja/eventos, mascote, faixa contínua e carrossel de gestão com estados acessíveis. | **P1:** consolidar a captura de interesse de novos membros em uma seção de conversão rastreável e acrescentar microprovas de benefício e prazo de retorno. |
| Loja | O hero ganhou o mascote; a vitrine possui categorias e o carrinho continua acessível. Os itens publicados foram listados como indisponíveis. | **P0 operacional:** antes de acrescentar produtos, cadastrar itens reais, estoque, preço, categoria e imagem institucional existente no ERP, para evitar catálogo fictício ou conversão frustrada. **P1:** expor filtro de Vestuário por subcategoria/tamanho e Acessórios por uso, após existirem dados de variante. |
| Navegação comercial | O carrinho permanece visível e há retorno à página inicial e aos eventos. | **P2:** acrescentar contador de itens e resumo de frete/retirada somente quando houver políticas comerciais aprovadas. |

## Evidências das superfícies operacionais

| Superfície | Evidência confirmada | Oportunidade priorizada |
|---|---|---|
| ERP — visão geral | A navegação lateral já consolida Pedidos, Catálogo, Eventos, Pessoas, Relatórios, Governança, Automações, Sympla, Atividades, Tabelas e ODS. Há contadores operacionais e links de entrada para os módulos. O novo slot de mascote requer uma verificação de carregamento do asset no ambiente publicado. | **P0:** mostrar um estado de fallback visual quando o asset institucional não carregar. **P1:** trocar os cards de módulo por uma visão “Hoje” ordenada por exceções: pedidos aguardando ação, estoque crítico, check-ins abertos e cadastros de interesse pendentes. |
| ODS | A página apresenta fila, retorno ao ERP, criação manual de pedido e atualização, mas o estado vazio ocupa grande área sem orientar a primeira ação. | **P1:** criar estado vazio operacional com três caminhos claros — criar pedido manual, sincronizar pedidos e abrir fila no ERP — e reservar métricas de tempo/itens para quando houver pedidos ativos. |
| Construtor de Tabelas | A rota falhava em produção quando o identificador automático de uma coluna ficava vazio; a normalização de slug e os testes de regressão já foram incluídos nesta entrega. | **P0 resolvido em código:** publicar a correção e validar a criação de uma coluna numérica opcional em uma tabela de homologação antes de usá-la novamente em produção. |

## Eventos, acesso e próximos aprimoramentos

| Superfície | Evidência confirmada | Oportunidade priorizada |
|---|---|---|
| Eventos públicos | Sem evento publicado, a página explica o estado e oferece criação de conta, mas não captura interesse vinculado ao próximo evento. | **P1:** reutilizar o cadastro de interesse com origem `eventos`, permitindo notificar a pessoa quando o primeiro evento for publicado. **P2:** quando houver eventos, destacar data, local, lote, disponibilidade e origem do ingresso (plataforma/Sympla) no primeiro nível do card. |
| Login | A composição atual tem boa separação entre identidade e formulário, Google OAuth e recuperação de senha disponíveis. O refinamento desta entrega introduz mascote, profundidade reativa e foco mais discreto; a página publicada deverá ser validada após o deploy. | **P1:** acrescentar uma frase curta de privacidade e suporte próximo aos controles de conta, sem sobrecarregar o fluxo de autenticação. |
| Backoffice transversal | A estrutura de módulos está presente, porém as telas com ausência de dados ainda usam áreas grandes sem instrução operacional suficiente. | **P1:** padronizar estados de vazio, carregamento e erro com contexto, ação primária e link secundário em Pedidos, Catálogo, Eventos, ODS, Tabelas e Relatórios. |

## Backlog recomendado

| Prioridade | Iniciativa | Valor operacional | Dependência |
|---|---|---|---|
| P0 | Publicar e validar a correção de slug do Construtor de Tabelas. | Elimina a indisponibilidade da criação de colunas. | Deploy e teste em tabela de homologação. |
| P0 | Cadastrar produtos reais pelo ERP, com preço, estoque, categoria e ativos já aprovados. | Torna filtros e checkout acionáveis sem catálogo fictício. | Relação de produtos e dados comerciais. |
| P1 | Fila “Hoje” no ERP e estados vazios orientados à ação no ODS. | Reduz a necessidade de navegar entre módulos para priorizar trabalho. | Regras de priorização dos setores. |
| P1 | Formulário de interesse por evento e painel de follow-up para a equipe. | Converte demanda antes da abertura de lotes. | Definição de responsável e SLA de retorno. |
| P1 | Página de catálogo com subcategorias, tamanhos e cores somente quando as variantes forem cadastradas. | Melhora descoberta e reduz erro de escolha. | Dados de variantes e estoque por SKU. |
| P2 | Centro de ajuda contextual para operadores. | Acelera adoção do backoffice sem introduzir jargão técnico. | Conteúdo operacional aprovado. |

## Validação local desta entrega

| Fluxo | Resultado |
|---|---|
| Landing | Hero permaneceu legível, a esteira contínua e o formulário de interesse foram renderizados com campos, escolhas de setor, consentimento e explicação de encaminhamento ao ERP. |
| Login | A prévia local respondeu com sucesso após a reinicialização do servidor de desenvolvimento pós-build. A composição apresentou a camada de profundidade; a confirmação final do enquadramento do mascote deve ser repetida no deployment, pois o viewport de captura estava acima da sua área de destaque. |
| Testes e build | A suíte completa precedeu o build de produção. O build concluiu a compilação, checagem de tipos, geração das 11 páginas estáticas e rastros de build; apenas avisos preexistentes do Autoprefixer permaneceram. |

## Regras de decisão

Não foram inseridos produtos, favicons, ícones ou mascotes novos durante esta etapa porque não há uma relação aprovada de itens, preços, estoque e ativos existentes. O catálogo continuará sendo abastecido pelo CMS/ERP, mantendo a vitrine pública como reflexo dos dados operacionais em vez de criar conteúdo fictício.

As próximas inspeções cobrirão a hierarquia de trabalho do ERP, os estados de fila no ODS e o funil de inscrição nos eventos. As recomendações serão classificadas por impacto operacional, risco de execução e dependência de dados externos.

## Validação posterior em produção

Na publicação do commit `9a24388`, a landing exibiu o bloco **Vem pra FSA**, os campos de interesse, o texto de consentimento e as opções de setor. O login carregou o mascote institucional e a superfície azul de profundidade reativa, mantendo a separação de contraste entre identidade e formulário. O ERP exibiu o mascote institucional no cabeçalho, substituindo o ornamento anterior do canto superior direito.

## Inventário observado para revisão operacional

Em `https://atleticafsa.site/admin/catalogo`, com sessão administrativa, foram observados seis produtos ativos e quatro categorias: Vestuário, Acessórios, Colecionáveis e Bebidas. Os preços cadastrados são Camiseta Oficial FSA (R$ 69,90), Moletom Titular FSA (R$ 149,90), Copo FSA (R$ 24,90), Chaveiro Coelho FSA (R$ 14,90), Figurinhas FSA (R$ 8,00) e Bebida em lata (R$ 7,00). Todos os itens exibiam **0 em estoque**, portanto não há base operacional para aumentar ou reduzir estoque de forma responsável sem contagem física ou confirmação da diretoria. Nenhum valor foi alterado nesta inspeção.

## Auditoria funcional complementar

| Módulo | Controle de acesso confirmado | Evidência de implementação | Resultado da auditoria sem mutação |
|---|---|---|---|
| Visão geral do ERP | `admin`, `caixa` e papel interno `cozinha` (exibido como Backoffice) | Contadores de produtos, pedidos, eventos e pessoas; atalhos filtrados para `caixa`. | Estrutura e build válidos. Recomenda-se alinhar futuramente o identificador técnico `cozinha` ao vocabulário Backoffice por meio de migração compatível, sem alterar papéis existentes em produção. |
| Pedidos e catálogo | `admin` e `caixa` | Listas filtráveis, produtos, categorias e variantes; ODS recebe o catálogo. | Coberto por testes de fluxo de pedidos, disponibilidade de checkout, imagens de catálogo e exportação. Sem ajuste de preço ou estoque. |
| Eventos | `admin` | Eventos, lotes, inscrições, check-in e origem de inscrição/pagamento são carregados no módulo. | Coberto por testes de tickets, RPCs de inscrição e check-in. A validação real de um novo ingresso permanece dependente de um evento/lote de homologação. |
| Pessoas | Presidente | Convites, perfis, papéis e fila `member_interest_applications`. | Migração aplicada; fluxo de triagem está implementado. Não foi submetido cadastro público para não criar dados de produção. |
| Governança, automações e atividades | Presidente para governança/automações; `admin` para atividades | Permissões granulares, regras de automação e trilha CRM protegidas no servidor. | Coberto por testes de permissões, grants, automações e atividades. |
| Relatórios | `admin` | Métricas de pedidos, pagamentos, inscrições e eventos. | Coberto por testes de analytics e exportação; dados permanecem somente de leitura nesta auditoria. |
| Construtor de tabelas | Presidente, diretor ativo do setor ou grant `table:*` de leitura | Shell administrativo verifica associação setorial ou permissão granular. | Correção de slug continua coberta por testes; criação em produção não foi repetida. |
| ODS | `admin`, `caixa` e papel interno `cozinha` | Fila de pedidos, venda presencial/manual e atualização operacional. | Coberto por testes de pedido, retirada por token e resiliência Point; validação com venda real exige homologação de pagamento e estoque físico. |

### Resultado técnico consolidado

A suíte executada após a correção da landing aprovou **136 testes**, com **3 cenários explicitamente ignorados**, e o build do Next.js concluiu compilação, tipos, páginas estáticas e rastros de produção. A rota pública raiz foi lida externamente após o deployment `dpl_8pjTMTD1ff1AcXU8GpdyGVxSZ8MN`, retornando a landing completa; a consulta de logs vinculada ao deployment não encontrou respostas HTTP 500 no período verificado.

O controle de acesso é centralizado por funções de servidor: ausência de sessão redireciona para login, papéis não autorizados seguem para a conta com acesso negado e a tentativa é registrada na trilha de CRM. A trava de pagamentos é configurável por `PAYMENTS_ENABLED`; esta auditoria não a ativou nem realizou cobrança, e a configuração de produção deve permanecer desabilitada até a homologação autorizada.

### Pendências que exigem insumo ou autorização da diretoria

| Prioridade | Pendência | Ação necessária antes da execução |
|---|---|---|
| P0 operacional | Ajustar os seis saldos de estoque em zero. | Contagem física por SKU/variante e confirmação explícita dos valores. |
| P1 | Validar ponta a ponta a entrada de interesse de novo membro. | Aprovação para criar e, depois, arquivar um registro de teste ou uso de homologação isolada. |
| P1 | Validar emissão, pagamento e retirada de pedido/ingresso. | Estoque de homologação e credenciais/teste do Mercado Pago em ambiente de homologação. |
| P1 | Validar evento sincronizado via Sympla. | Evento/lote de homologação ou autorização de uma sincronização controlada. |
