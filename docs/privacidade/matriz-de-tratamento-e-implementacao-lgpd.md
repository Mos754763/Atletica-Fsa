# Matriz de Tratamento, Aceites e Implementação LGPD — ATLETICA FSA

> **Documento interno — minuta para revisão jurídica e de governança.** Versão 0.1, de 19 de agosto de 2026. Esta matriz registra os tratamentos observados no código e separa o que já existe do que precisa ser implementado antes de publicar os termos de aceite.

## 1. Princípios de aplicação

A base legal deve ser definida por finalidade, e não por conveniência de uma caixa única de consentimento. O consentimento somente é adequado quando for livre, informado, inequívoco e destacável; tratamentos necessários à conta, pedido, evento ou segurança devem ser explicados de modo transparente, mas podem seguir outra hipótese legal aplicável.[1] A decisão final de enquadramento e dos prazos de retenção cabe à entidade controladora com validação jurídica.

| Perfil | Acesso funcional observado | Dados próprios tratados | Dados de terceiros acessíveis | Aceite necessário |
|---|---|---|---|---|
| Visitante | Landing, catálogo e eventos públicos | Nenhum cadastro obrigatório | Nenhum | Não; aviso público de privacidade |
| Titular de conta/cliente | Conta, pedidos, carrinho, inscrições, ingressos | Perfil, pedidos, eventos, comunicações | Apenas seus próprios registros | Termos gerais e aviso de privacidade |
| Interessado em participar | Formulário público de triagem | Nome, e-mail, WhatsApp opcional, curso, período, interesses e mensagem | Nenhum | Consentimento específico obrigatório |
| Backoffice (`cozinha`) | ODS e operação de fila | Seu perfil e atividades | Dados mínimos de pedidos/retirada/check-in sob escopo | Termo interno de confidencialidade e uso aceitável |
| Caixa | Pedidos, confirmação operacional, catálogo e relatórios autorizados | Seu perfil e atividades | Dados necessários de pedidos e pagamentos sob escopo | Termo interno de confidencialidade e uso aceitável |
| Admin/Presidência | ERP, membros, eventos, catálogo, automações, auditoria e permissões | Seu perfil e atividades | Dados operacionais conforme RBAC; candidaturas pela Presidência | Termo administrativo reforçado |
| Diretor/membro/visualizador setorial | Tabelas e operações explicitamente concedidas | Seu perfil e atividades | Apenas registros do setor e escopo concedido | Termo setorial de confidencialidade e menor privilégio |

## 2. Inventário de tratamentos efetivamente modelados

| Operação e fonte | Dados tratados | Finalidade | Hipótese a validar | Destinatários/operadores | Estado atual |
|---|---|---|---|---|---|
| Criação e autenticação de conta | E-mail, nome de exibição, avatar opcional, identificador e papel | Autenticação, segurança, personalização da conta e autorização | Execução de contrato/procedimentos preliminares; legítimo interesse de segurança, conforme análise jurídica | Supabase Auth, Supabase e Vercel | Implementado |
| Pedido e carrinho | Nome, e-mail, itens, valores, observações, modalidade, estados e histórico | Formar e executar pedido, atendimento, entrega/retirada e defesa de direitos | Execução de contrato; obrigação legal quando aplicável | Supabase, Vercel, Resend e Mercado Pago quando houver pagamento | Implementado |
| Pagamento e conciliação | Referência do provedor, status, valor, data, dados de conciliação | Cobrança, confirmação, prevenção a fraude e contabilidade | Execução de contrato; obrigação legal; prevenção à fraude, conforme análise | Mercado Pago, Supabase e Vercel | Implementado com gate de pagamentos em produção desativado |
| Inscrição, ingresso e check-in | Nome/e-mail do participante, evento, lote, valor, status, QR/código, data/hora e operador do check-in | Inscrição, emissão, acesso ao evento, controle de capacidade e suporte | Execução de contrato/procedimentos preliminares | Supabase, Vercel, Resend, Mercado Pago e Sympla quando aplicável | Implementado |
| Interesse em ser membro | Nome, e-mail, WhatsApp opcional, curso, período, interesses, mensagem, consentimento e triagem | Analisar interesse, entrar em contato e organizar convite/triagem | Consentimento específico | Supabase e Vercel; acesso interno da Presidência | Implementado; consentimento existente no formulário |
| E-mail transacional | E-mail, template, referência de pedido/inscrição, data e entrega | Confirmações, recuperação de conta e comunicações operacionais | Execução de contrato, segurança e/ou obrigação legal, conforme caso | Resend, Supabase e Vercel | Implementado |
| Auditoria interna/CRM | Identificador do agente, ação, resultado, recurso, data/hora e metadados minimizados | Segurança, integridade, apuração de operação e accountability | Legítimo interesse/execução de atribuições internas, conforme análise | Supabase e usuários autorizados | Implementado |
| Sincronização com Sympla | Identificadores e estados de eventos/inscrições recebidos da integração | Sincronizar origem externa, evitar duplicidade e atender participantes | Execução de contrato/relação de evento, conforme configuração | Sympla, Supabase, Vercel e alertas técnicos | Implementado sob configuração |
| Alertas técnicos | Dados técnicos de integração e erro; não incluir dados pessoais completos | Saúde de serviços, resposta a incidentes e reprocessamento | Legítimo interesse de segurança e continuidade, conforme análise | Slack, Supabase e Vercel | Implementado; requer minimização contínua |

## 3. Retenção proposta para aprovação

Os prazos abaixo são uma **proposta operacional**, não uma conclusão jurídica. Devem ser aprovados pela entidade responsável considerando obrigações fiscais, contábeis, consumeristas, contratuais e de defesa de direitos. Enquanto não aprovados, não devem ser divulgados como promessa definitiva ao titular.

| Categoria | Proposta operacional de retenção | Regra de descarte/anonimização a implementar |
|---|---|---|
| Conta inativa | Enquanto houver relação ativa; revisão após prazo aprovado de inatividade | Anonimizar ou excluir quando não houver obrigação/necessidade remanescente |
| Pedidos e pagamentos | Prazo legal/contábil aplicável, a confirmar por assessoria | Restringir acesso após encerramento; eliminar dados excedentes ao final |
| Inscrições e ingressos | Até encerramento do evento e prazo de suporte/defesa aprovado | Anonimizar QR/códigos e dados não exigidos após o prazo |
| Candidaturas de interesse | Até conclusão da triagem ou prazo aprovado após último contato | Arquivar com acesso restrito; excluir/anonomizar ao fim do prazo ou após revogação quando cabível |
| E-mails transacionais | Pelo prazo necessário para prova de envio, suporte e obrigações | Eliminar conteúdo excedente e preservar somente metadados mínimos quando possível |
| Logs de auditoria | Prazo de segurança e responsabilização aprovado | Restringir leitura; expurgar metadados excessivos e manter apenas o necessário |

## 4. Mapa de consentimentos e textos de interface

| Momento de interface | Tipo de aceite | Obrigatório? | Estado de implementação | Requisito mínimo |
|---|---|---|---|---|
| Cadastro/autenticação | Termos de Uso e Aviso de Privacidade | Sim, para abrir conta | **Pendente** de persistência formal | Caixa desmarcada, links para versão, registro de versão/data/usuário |
| Formulário de interesse de membro | Consentimento para triagem e contato | Sim, apenas para enviar o formulário | Parcialmente implementado | Manter caixa desmarcada; registrar versão do texto além de `consent_at` |
| Pedido/inscrição | Confirmação de dados e regras operacionais | Sim, antes da conclusão | **Pendente** de UI/evidência | Exibir regras de pagamento, status, retirada/check-in e registrar aceite |
| Marketing | Consentimento promocional | Não | Não implementar sem opt-in e descadastro | Finalidade separada, canais selecionáveis, revogação simples e registro |
| Primeiro acesso ao ERP | Confidencialidade, RBAC e auditoria | Sim, para acesso operacional | **Pendente** | Aceite por papel e versão; bloqueio controlado até leitura/aceite |
| Alteração material dos termos | Novo aceite da versão | Quando a mudança afetar o usuário | **Pendente** | Comparar versão, explicar mudança e armazenar novo registro |

## 5. Modelo técnico mínimo para evidência de aceite

A aplicação ainda não mantém uma tabela dedicada e imutável de aceites gerais. Antes de exibir os termos, recomenda-se criar uma estrutura de evidência como `legal_acceptances`, protegida por RLS e escrita apenas no servidor. O modelo abaixo é referência técnica, não migração automática:

| Campo sugerido | Finalidade |
|---|---|
| `id` | Identificador do registro |
| `profile_id` ou `subject_email_hash` | Vincular o aceite ao titular, conforme o fluxo autenticado ou público |
| `document_key` | Ex.: `terms_of_use`, `privacy_notice`, `member_interest_consent`, `staff_confidentiality` |
| `document_version` | Versão exata apresentada ao titular |
| `accepted_at` | Data/hora com fuso UTC |
| `channel` | Web, app, convite administrativo ou formulário público |
| `purpose` | Finalidade do aceite/consentimento |
| `revoked_at` e `revocation_reason` | Evidenciar revogação quando aplicável |
| `evidence_json` minimizado | Idioma, versão de interface e referência de tela; evitar registrar conteúdo excessivo ou dados sensíveis |

O formulário de interesse deve ganhar `consent_version`. Aceites de funcionários/membros devem usar documento próprio e não autorizar acesso além das permissões técnicas já atribuídas. O registro de aceite é evidência de ciência; a autorização efetiva continua dependente de autenticação, RBAC, RLS e validação server-side.

## 6. Requisitos de segurança e governança antes da ativação

O ERP já modela papéis, Presidência, setores, permissões granulares e trilhas de atividade. A publicação dos termos deve ser acompanhada por revisão de RLS, revogação de acesso de pessoas desligadas, menor privilégio, revisão periódica de exportações e checagem de que alertas técnicos não transportem dados pessoais completos. A ANPD mantém materiais específicos sobre agentes de tratamento, encarregado e segurança da informação que podem orientar essa governança.[3] [4]

Há um requisito adicional para menores de idade: o fluxo atual não coleta idade nem comprovação de autorização. Antes de direcionar a plataforma a menores ou coletar seus dados de forma habitual, a ATLETICA FSA deve obter avaliação jurídica e implementar mecanismo compatível com a legislação aplicável. Até isso ocorrer, as telas não devem declarar que possuem coleta especialmente adequada para esse público.

Cookies ou tecnologias não essenciais exigem aviso e mecanismo próprio de preferências antes de sua ativação. Esta matriz não presume que tal mecanismo já esteja implementado.

## 7. Critérios de aceite para publicação

| Critério | Responsável sugerido | Evidência esperada |
|---|---|---|
| Preencher controlador, CNPJ, endereço e canal de privacidade | Presidência/entidade responsável | Dados aprovados no documento e no rodapé do site |
| Validar hipóteses legais e retenção | Assessoria jurídica e Presidência | Parecer ou aprovação registrada |
| Configurar documento versionado e registros de aceite | Desenvolvimento | Migração, RLS, testes e tela de histórico |
| Separar comunicações promocionais das transacionais | Marketing/Presidência e desenvolvimento | Opt-in, descadastro e logs de preferência |
| Treinar usuários internos | Presidência e diretores | Termo aceito, lista de presença ou trilha de capacitação |
| Criar rotina de atendimento de direitos | Encarregado/canal de privacidade | Fluxo, SLA interno e responsável definido |

## Referências

[1]: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm "Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD)"
[2]: https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares "ANPD — Direitos dos Titulares"
[3]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-para-definicoes-dos-agentes-de-tratamento-de-dados-pessoais-e-do-encarregado "ANPD — Guia sobre agentes de tratamento e encarregado"
[4]: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-sobre-seguranca-da-informacao-para-agentes-de-tratamento-de-pequeno-porte "ANPD — Guia sobre segurança da informação"
