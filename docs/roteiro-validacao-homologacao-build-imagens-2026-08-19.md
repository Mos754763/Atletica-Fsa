# Roteiro de validação, homologação, build e ativos visuais

**Data:** 19 de agosto de 2026  
**Escopo:** transparência de testes, correção dos avisos CSS, homologação do interesse de membros e direção de prompts de imagem.  
**Regra permanente:** não alterar estoque, preços, dados operacionais ou `PAYMENTS_ENABLED=false` em Production.

## 1. Cobertura real: o que foi e o que não foi verificado

Não seria correto afirmar que **todas** as integrações, todos os fluxos e todos os bugs possíveis foram verificados ou corrigidos. Uma aplicação desta dimensão exige validações repetíveis por ambiente, monitoramento e cenários com serviços externos. A correção atual elimina uma causa confirmada da indisponibilidade da landing e reduz a possibilidade de regressão, mas não substitui a homologação dos fluxos que gravam dados ou dependem de fornecedores externos.

| Área | Evidência concluída | Limite da verificação |
|---|---|---|
| Landing e formulário | A exceção 500 da rota `/` foi vinculada a uma exportação de valor em arquivo `use server`, corrigida e protegida por teste de regressão. O deployment `dpl_8pjTMTD1ff1AcXU8GpdyGVxSZ8MN` ficou `READY`; a leitura externa da landing exibiu o formulário completo e a consulta de logs do novo deployment não retornou HTTP 500. | O envio real não foi executado em Production, pois criaria um registro operacional. |
| Testes e build | `pnpm test` aprovou **136 testes** e manteve **3** cenários explicitamente ignorados. `pnpm build` concluiu compilação, tipos, geração de páginas e rastros de build. | Teste unitário/build não substitui teste visual, E2E autenticado ou integração real. |
| Autorização do ERP | As páginas administrativas passam por autenticação no servidor; os módulos verificam `admin`, `caixa`, presidente, grants de tabela e associação setorial conforme o caso. Tentativas negadas são registradas no CRM. | Ainda deve haver uma matriz E2E por papel em homologação, usando contas de teste. |
| Catálogo | A revisão confirmou seis produtos e quatro categorias, todos com estoque `0`; nenhum preço, imagem ou estoque foi alterado. | Não foi feita contagem física, cadastro de variante ou teste de compra de item disponível. |
| Eventos, QR e ODS | Há testes de tickets, check-in, RPCs de inscrição, retirada e resiliência de Point; o build inclui as rotas. | Falta rodada controlada com evento/lote de homologação e pedido real de teste. |
| Mercado Pago, Sympla, Resend, Slack e cron | Há módulos e testes unitários de roteamento de webhook, idempotência, saúde de integração, alertas e cron. | A entrega de e-mail, pagamento aprovado, sincronização Sympla, dead letter e alerta precisam de execução controlada atual no ambiente de homologação. |

> **Conclusão operacional:** não há evidência do erro 500 anterior na nova versão da landing, mas não há garantia honesta de ausência de todos os defeitos possíveis. O caminho para elevar a confiança é executar os cenários pendentes em homologação, registrar evidências e só então promover qualquer mudança que dependa de dados externos.

## 2. Avisos do Autoprefixer: correção segura

O último build foi aprovado, mas o Autoprefixer sinalizou usos de `start` e `end` em declarações de alinhamento CSS, em especial nos estilos globais, de eventos administrativos e de ODS. Esses avisos indicam compatibilidade mista de valores lógicos em alguns contextos flex; eles não causaram a falha da landing e não devem ser corrigidos por substituição global cega.

| Etapa | Ação recomendada | Critério de aceite |
|---|---|---|
| 1. Localizar | Mapear cada aviso do build e conferir se o seletor correspondente usa `display: flex`. | Lista de declarações com arquivo, seletor e contexto de layout. |
| 2. Ajustar apenas Flex | Em contêiner Flex, trocar `align-items: start/end`, `justify-content: start/end` e `align-self: start/end` por `flex-start/flex-end`. | Sem mudança visual intencional no alinhamento. |
| 3. Preservar Grid | Não alterar automaticamente `justify-items`, `place-items` ou regras cujo contexto seja CSS Grid; nesses casos `start/end` pode ser semântico e apropriado. | Grid continua com mesma direção e responsividade. |
| 4. Revalidar | Rodar `pnpm test`, `pnpm build` e uma inspeção responsiva de landing, login, loja, ERP, ODS e eventos. | Build sem avisos conhecidos do Autoprefixer e sem regressão visual. |
| 5. Prevenir | Adicionar uma verificação simples de CSS focada nos padrões inseguros para Flex, sem bloquear usos legítimos em Grid. | Pull request futura não reintroduz os mesmos avisos. |

Após zerar os avisos, a otimização do Next.js deve seguir uma medição antes de qualquer refatoração. O relatório atual indica que a loja é a maior rota pública em JavaScript inicial; isso é um sinal de investigação, **não** uma justificativa para remover funcionalidades. O Next.js já aplica divisão por rota e otimizações de Server Components; a análise deve identificar módulos grandes antes de agir.[1] [2]

| Ordem | Medição/ação | Decisão baseada na medição |
|---|---|---|
| 1 | Preservar a saída de tamanho por rota do build atual como linha de base. | Comparar cada alteração contra esse baseline. |
| 2 | Habilitar análise de bundle somente sob uma flag de desenvolvimento, com `@next/bundle-analyzer` compatível com a versão atual do projeto. | Encontrar dependências, ícones ou componentes cliente realmente grandes. |
| 3 | Revisar fronteiras `"use client"` e mover renderização puramente estática para Server Components. | Reduzir JavaScript enviado ao navegador sem remover interação. |
| 4 | Carregar sob demanda painéis pouco frequentes, como modal/drawer de carrinho, gráficos pesados ou efeitos de experiência não essenciais. | Manter a primeira renderização rápida e preservar o recurso quando acionado. |
| 5 | Avaliar `optimizePackageImports` somente se o analisador apontar bibliotecas de muitos exports como causa material. | Evitar otimização prematura ou configuração sem ganho mensurável. |
| 6 | Medir com Lighthouse e Core Web Vitals após cada grupo de mudanças. | Melhorar métricas sem piorar acessibilidade, SEO ou fluxo operacional.[1] |

## 3. Cadastro de interesse em homologação: procedimento ponta a ponta

O teste deve ocorrer no projeto Vercel de homologação, apontado exclusivamente para o Supabase de homologação. A credencial de produção, a URL de Production, chaves financeiras e qualquer dado produtivo não devem ser copiados para esse ambiente. Antes da execução, publicar no Preview a mesma revisão de código que contém `55abbc0` e confirmar que a migração `20260819110000_member_interest_intake.sql` está aplicada **somente no banco de homologação**.

| Fase | Procedimento | Resultado esperado |
|---|---|---|
| Pré-checagem | Confirmar URL do Preview, variáveis Supabase de homologação, `PAYMENTS_ENABLED=false` e conta administrativa exclusiva de QA. | Nenhuma variável aponta para Production. |
| Migração | Aplicar a migração de interesse de membros no SQL Editor de homologação, de modo idempotente, e confirmar a tabela `member_interest_applications`. | Estrutura, RLS e políticas disponíveis no ambiente de teste. |
| Envio válido | Na landing de Preview, enviar `QA Membro Fluxo`, e-mail único no domínio `.test`, dois interesses, consentimento marcado e dados opcionais sintéticos. | Mensagem de sucesso e uma única linha com status `novo`. |
| Triagem | Entrar no ERP de homologação como presidente/admin de QA, abrir **Pessoas**, localizar o registro e alterar o status para `em_contato`, depois `convidado`. | Registro visível, interesses corretos e transições registradas. |
| Validação negativa | Reenviar o mesmo e-mail e tentar submeter sem consentimento. | Nenhum segundo registro; mensagens de validação claras. |
| Antibot | Preencher o campo invisível `company` em uma rodada de QA controlada. | Resposta neutra sem inserção no banco. |
| Encerramento | Alterar o registro de teste para `arquivado` e registrar identificador, horário, URL do Preview e resultado no relatório de homologação. | Evidência preservada, sem contaminar dados de Production. |

O registro deve ser **arquivado**, não apagado automaticamente, porque isso mantém a trilha de auditoria de QA. Caso a política de retenção exija remoção física em homologação, essa exclusão deve ser aprovada separadamente e executada apenas após registrar a evidência do teste. A produção continuará sem envio do formulário até confirmação explícita.

## 4. Guia de prompts para todos os ativos visuais

### Direção compartilhada

Aplicar este bloco a todos os prompts abaixo: **paleta ATLETICA FSA**: azul `#0B3D91`, amarelo `#FFD23F`, branco e preto; estética esportiva universitária brasileira, premium, energética e limpa; iluminação cinematográfica suave; alto contraste; sem marca d’água, sem interface falsa, sem moldura de Instagram, sem QR code e sem texto legível. Não pedir ao modelo para escrever `FSA`: a marca oficial deve ser aplicada no produto final a partir do arquivo de logo aprovado, para evitar tipografia incorreta. Quando o mascote aparecer, manter um coelho branco atlético com tapa-olho preto, jaqueta universitária azul e amarela, silhueta completa e expressão confiante.

| Ativo | Proporção e uso | Prompt pronto para geração |
|---|---|---|
| Hero da landing | 16:9, texto à esquerda | `Create a premium 3D editorial hero illustration for a Brazilian university athletics landing page. Subject: the ATLETICA FSA white rabbit mascot, full silhouette, black eyepatch, blue and yellow varsity jacket with a blank chest patch reserved for an approved logo, standing confidently on the right side. Composition: 40 percent clean dark-blue negative space on the left for website headline, subtle yellow energy ribbons and floating sports particles, no cropped ears or feet. Style: polished cinematic 3D, #0B3D91, #FFD23F, white and black, dramatic but friendly studio lighting. Text/content to render: no text. Constraints: 16:9 landscape, complete subject, web hero, no logos or readable lettering. Avoid: Instagram frame, watermark, extra limbs, cropped mascot, green glow, busy left side.` |
| Hero da loja | 16:9, texto à esquerda | `Create a premium 3D commerce hero for the official ATLETICA FSA store. Subject: the same white rabbit mascot with black eyepatch, carrying a folded blue-and-yellow varsity garment and a reusable cup, positioned on the right, full silhouette. Composition: clean deep-blue background with yellow athletic motion trails, generous empty space on the left for store heading, subtle shelves and product shapes in the far background. Style: refined university sports editorial, cinematic light, #0B3D91, #FFD23F, white and black. Text/content to render: no text. Constraints: 16:9 landscape, no readable logos or labels. Avoid: e-commerce UI, price tags, Instagram elements, cropped limbs, green accents.` |
| Mascote recortado | PNG transparente para login/ERP | `Create a transparent-background character asset for ATLETICA FSA. Subject: full-body white rabbit mascot with one black eyepatch, blue-and-yellow varsity jacket with a blank logo patch, sneakers, confident welcoming pose, front three-quarter view. Composition: centered, whole ears and feet visible, balanced silhouette for use beside login and ERP panels. Style: polished 3D mascot, clean edges, soft studio highlights, #0B3D91 and #FFD23F accents. Text/content to render: no text. Constraints: true transparent background, 4:5 vertical, complete alpha cutout. Avoid: scenery, shadows outside the character, letters, watermark, cropped anatomy.` |
| Eventos | 16:9, capa sem data | `Create a dynamic event-cover illustration for ATLETICA FSA. Subject: an energetic university crowd with flags, a distant sports court and celebration lights, seen from a cinematic low angle, no identifiable real people. Composition: vivid focal energy on the right and a clean dark-blue information area on the left reserved for event details. Style: high-end editorial sports campaign, blue #0B3D91, yellow #FFD23F, white and black, realistic light with illustrative polish. Text/content to render: no text. Constraints: 16:9 landscape. Avoid: readable signs, brand logos, dates, QR codes, Instagram framing, alcohol as the central element.` |
| Setor — Esportes | 4:5 card vertical | `Create a vertical editorial illustration for the ATLETICA FSA Esportes sector. Subject: a university team huddle before a match, dynamic athletic movement, abstract court geometry and subtle mascot-shaped light motif. Composition: strong central action with a calm blue edge for overlay label. Style: premium Brazilian collegiate sport, #0B3D91, #FFD23F, white and black, cinematic light. Text/content to render: no text. Constraints: 4:5 vertical. Avoid: readable uniforms, real club logos, watermark, extra fingers.` |
| Setor — Eventos | 4:5 card vertical | `Create a vertical editorial illustration for the ATLETICA FSA Eventos sector. Subject: a vibrant university celebration setup with stage light beams, flags and an excited anonymous crowd, clean organized atmosphere. Composition: layered depth and a dark-blue safe area for overlay label. Style: premium event campaign, #0B3D91, #FFD23F, white and black, cinematic. Text/content to render: no text. Constraints: 4:5 vertical. Avoid: readable signs, real faces, brand logos, Instagram elements.` |
| Setor — Sociais | 4:5 card vertical | `Create a vertical editorial illustration for the ATLETICA FSA Sociais sector. Subject: a diverse group of university friends connecting around a blue-and-yellow community flag, warm authentic gesture, no identifiable real people. Composition: centered group with soft dark-blue background space for overlay label. Style: welcoming premium collegiate editorial, #0B3D91, #FFD23F, white and black. Text/content to render: no text. Constraints: 4:5 vertical. Avoid: legible text, watermarks, party logos, exaggerated anatomy.` |
| Setor — Marketing | 4:5 card vertical | `Create a vertical editorial illustration for the ATLETICA FSA Marketing sector. Subject: a creative university team planning a sports campaign with abstract photo lights, blank poster surfaces and yellow geometric fragments. Composition: visual depth, intelligent creative mood, a dark-blue safe zone for overlay label. Style: contemporary Brazilian sports design editorial, #0B3D91, #FFD23F, white and black. Text/content to render: no text. Constraints: 4:5 vertical. Avoid: readable poster text, software UI, watermarks, real company logos.` |
| Setor — Suprimentos | 4:5 card vertical | `Create a vertical editorial illustration for the ATLETICA FSA Suprimentos sector. Subject: an organized equipment and merchandise preparation station with folded blue-and-yellow apparel, sealed boxes, reusable cups and sporting goods, no readable labels. Composition: organized depth, clear product silhouettes, dark-blue area for overlay label. Style: premium operations editorial, #0B3D91, #FFD23F, white and black. Text/content to render: no text. Constraints: 4:5 vertical. Avoid: barcodes, product brand names, watermark, clutter.` |
| ODS vazio | 16:9, painel operacional | `Create a subtle background illustration for an empty Order Display System state at ATLETICA FSA. Subject: abstract blue-and-yellow order tickets flowing toward a small full-body rabbit mascot holding a clipboard, calm operational scene. Composition: low visual contrast with generous center space reserved for real interface copy and action buttons. Style: minimal polished 3D, #0B3D91, #FFD23F, white and black. Text/content to render: no text. Constraints: 16:9 landscape, decorative background only. Avoid: fake dashboard UI, legible order IDs, payment brand marks, watermark.` |
| Produto real — prompt de edição | 1:1, aplicar sobre fotografia enviada | `Edit the provided product photograph for the ATLETICA FSA catalog. Preserve the exact product shape, colors, material, print, proportions and approved branding from the source photo. Replace only the environment with a clean premium studio setup in deep blue #0B3D91, soft yellow #FFD23F accent light, white reflection surface and realistic grounded shadow. Keep the entire product centered and fully visible. Text/content to render: preserve only the text that already exists on the real product. Constraints: 1:1 e-commerce image, faithful product representation. Avoid: inventing logos, changing garment cut, changing label text, adding people, price tags, Instagram frames or watermarks.` |

Os seis produtos atuais — camiseta, moletom, copo, chaveiro, figurinhas e bebida — devem usar o último prompt **com fotografia de referência própria para cada SKU**. Gerar o produto sem referência visual pode criar uma imagem bonita, mas imprecisa, e não deve ser usada como foto comercial de item real.

## Referências

[1]: https://nextjs.org/docs/app/guides/production-checklist "Next.js — Production checklist"
[2]: https://nextjs.org/docs/app/guides/package-bundling "Next.js — Optimizing package bundling"
