# Panorama da plataforma ATLETICA FSA

> **Situação registrada em 14 de agosto de 2026.** A ATLETICA FSA possui uma plataforma integrada para relacionamento com a torcida, venda de produtos, gestão de eventos e operação administrativa. O código-fonte está sincronizado no repositório privado [Mos754763/Atletica-Fsa](https://github.com/Mos754763/Atletica-Fsa), na revisão `4ace44f`.

## O que a plataforma é hoje

O sistema reúne, em uma única base, uma **landing page institucional**, uma **loja digital**, o fluxo de **pedido pelo celular com retirada**, uma tela operacional de pedidos, a gestão de **eventos e check-in** e um **ERP/backoffice** para a diretoria. A experiência pública segue a identidade visual azul, amarela, branca e preta da FSA; as áreas administrativas usam uma navegação lateral inspirada em ferramentas operacionais modernas.

| Frente | Público principal | Resultado prático |
|---|---|---|
| Institucional | Torcida, estudantes e visitantes | Apresenta a FSA, gestão, setores, loja, agenda e canais de acesso. |
| Comercial | Clientes e caixa | Permite catálogo, carrinho, criação de pedido e pagamento online. |
| Eventos | Participantes e diretoria | Centraliza inscrições, controle de vagas, confirmação e check-in. |
| Operação | Backoffice, caixa e administração | Organiza pedidos, fila, preparo, membros, catálogo, relatórios e permissões. |

## Experiência pública e loja

A página inicial comunica a proposta da atlética, apresenta os cinco setores — **Suprimentos, Eventos, Sociais, Marketing e Esportes** —, exibe a gestão de 2026, produtos em destaque e a agenda. Ela possui efeitos de cursor, revelação por rolagem, parallax, partículas leves e microinterações que respeitam `prefers-reduced-motion`.

As fotos de produtos agora usam os ativos de estúdio sem as formas geométricas que antes eram desenhadas por CSS sobre as imagens. Os cards de setores contam com imagens institucionais específicas, armazenadas no bucket público da própria organização. O mascote coelho com tapa-olho e uniforme FSA é usado como elemento de identidade também no ERP; o recorte sem fundo verde está em atualização automática no asset visual.

Na loja, o visitante encontra produtos, categorias e preços, adiciona itens ao carrinho e inicia um pedido. O desenho é responsivo e prioriza o uso em celular, pois o fluxo também atende ao modelo **Mobile Order & Pay**: o cliente faz o pedido no próprio telefone e retira no ponto de atendimento.

## Pedidos, pagamentos e ODS

O núcleo comercial foi desenhado para conectar a venda online ao atendimento presencial. A criação de preferência do **Mercado Pago Checkout Pro** ocorre no servidor; o webhook valida assinatura e confere o valor antes de alterar o pagamento. A integração para registro e conciliação de vendas via maquininha Mercado Pago POS permanece como evolução planejada, pois depende da configuração final de credenciais e do modelo operacional escolhido.

Após a confirmação de um pedido, a operação o acompanha no **ODS — Order Display System**. A tela possui atualização em tempo real via Supabase e transições de status controladas, evitando que atualizações simultâneas sobrescrevam o estado correto. O fluxo cobre o recebimento, preparo e disponibilização do pedido para retirada.

| Etapa | Componente responsável | Estado atual |
|---|---|---|
| Carrinho e pedido | Loja pública e APIs de pedidos | Implementado. |
| Checkout online | Mercado Pago Checkout Pro | Implementado; requer token operacional válido em produção. |
| Confirmação de pagamento | Webhook Mercado Pago | Implementado com validação de assinatura e valor. |
| Preparo e retirada | ODS com atualizações em tempo real | Implementado. |
| Maquininha presencial | Mercado Pago POS | Pendente de integração e credenciais finais. |

## Eventos e comunidade

O módulo de eventos permite criar e administrar experiências como jogos, campeonatos, festas e encontros. Cada evento pode ter informações operacionais, inscrições e acompanhamento de participantes. A presença é confirmada por código/check-in, reduzindo o trabalho manual da recepção.

As confirmações e lembretes são suportados por automações de e-mail via Resend. Há também uma rota de cron protegida por segredo para preparar lembretes de evento. A execução recorrente depende do agendamento configurado na Vercel e das variáveis de ambiente de produção. As referências de integração seguem as documentações do [Resend](https://resend.com/docs) e da [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs).[1][2]

## Conta, membros e permissões

O acesso funciona com **Google OAuth** e **e-mail/senha**, usando Supabase Auth. Após autenticar com o Google, o retorno é direcionado explicitamente para `/conta`; o callback aceita apenas caminhos internos válidos, prevenindo redirecionamento externo indevido.

Cada perfil possui um dos seguintes papéis: **admin**, **Backoffice** (valor técnico `cozinha`), **caixa** ou **cliente**. A tela de conta apresenta ao membro apenas as ações compatíveis com sua função. O ERP fica disponível apenas para papéis operacionais: administração, caixa e Backoffice. Os atalhos de ERP e ODS foram removidos da navegação pública; um visitante sem sessão em `/erp` é redirecionado para `/login`.

| Papel exibido | Permissão principal |
|---|---|
| Administrador | Gestão completa de membros, permissões, catálogo, eventos, pedidos e relatórios. |
| Backoffice | Operação de produção e acompanhamento no ODS. |
| Caixa | Pedidos e relatórios operacionais. |
| Cliente | Loja, pedidos próprios, eventos e área de conta. |

## ERP e operação administrativa

O ERP é a central de trabalho interna da atlética. A interface é organizada por barra lateral e páginas de visão geral, catálogo, pedidos, eventos, membros e relatórios. Os painéis trazem indicadores como faturamento, ticket médio, fila, SLA e andamento de pedidos, além de filtros nas tabelas de operação.

O módulo de membros permite convidar pessoas, consultar perfis e atribuir papéis. O módulo de catálogo permite administrar categorias, produtos, estoque e imagens. Pedidos, eventos e relatórios possuem filtros para que a diretoria consiga analisar o período, o status e o responsável sem depender de planilhas paralelas.

## Base técnica, segurança e operação

A aplicação usa **Next.js 15 com App Router e TypeScript**, Supabase para banco de dados, autenticação, políticas RLS, Storage e atualização em tempo real, Resend para e-mails e Mercado Pago para pagamentos. O projeto está preparado para hospedagem na Vercel, cujo modelo de deploy é compatível com a aplicação serverless.[3][4]

As rotas administrativas aplicam validação server-side por papel; a base possui 14 tabelas e políticas RLS para separar acesso público, cliente e operação. Os pontos críticos do pagamento contam com validação adicional no servidor, e o armazenamento institucional usa o bucket público `catalog-assets` sem expor credenciais no código.

| Ambiente ou integração | Situação |
|---|---|
| Supabase | Projeto conectado para Auth, PostgreSQL, Storage, RLS e Realtime. |
| Resend | Automação transacional preparada e configurável por variável de ambiente. |
| Mercado Pago | Checkout Pro e webhook prontos; POS presencial ainda depende da configuração final. |
| Vercel | Ambiente-alvo configurado com variáveis de produção e Preview. |
| GitHub | Repositório privado sincronizado em `main`, revisão `4ace44f`. |

## Qualidade e próximos passos reais

O ciclo recente foi validado com **26 testes automatizados aprovados em 10 arquivos**, checagem de tipos e build de produção concluído. As verificações cobrem regras de papéis, analíticos, eventos, membros, pedidos, pagamentos, armazenamento, configuração pública e o destino seguro do callback OAuth.

Para colocar todo o fluxo em operação real, os próximos passos dependem sobretudo de configuração externa: informar e validar as credenciais de produção do Mercado Pago, concluir o uso operacional da maquininha POS caso ela seja necessária, confirmar o agendamento do cron de lembretes na Vercel e testar um pagamento real de baixo valor com o webhook publicado. O código atual já dispõe das rotas e dos controles necessários para essas etapas.

## Referências

[1]: https://resend.com/docs "Documentação do Resend"
[2]: https://vercel.com/docs/cron-jobs "Documentação de Vercel Cron Jobs"
[3]: https://supabase.com/docs "Documentação do Supabase"
[4]: https://nextjs.org/docs "Documentação do Next.js"
