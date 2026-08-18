# Provisionamento de identidade de homologação

**Projeto Supabase:** `atletica-fsa-homolog` (`gfnbdjdqumewspvfxicl`)  
**Escopo:** Criar uma única identidade administrativa temporária, exclusivamente para o ensaio de Checkout Pro sandbox.

O painel de Authentication confirmou que a lista de usuários de homologação não continha perfis operacionais. O formulário de criação permite registrar e-mail, senha e confirmação automática, sem envio de e-mail. A criação foi explicitamente autorizada pelo responsável do projeto em 17 de agosto de 2026.

| Salvaguarda | Decisão |
|---|---|
| Projeto-alvo | Somente `gfnbdjdqumewspvfxicl`; nunca o projeto de Production. |
| Endereço | A identidade existe exclusivamente no projeto de homologação. Para permitir a confirmação pelo responsável, foi usado o e-mail do administrador, sem criar ou alterar qualquer registro no projeto de Production. |
| Confirmação | Automática, pois não há dependência de uma caixa postal na execução técnica. |
| Papel de negócio | O perfil será elevado por migration apenas para permitir a gestão do catálogo de teste. |
| Dados sensíveis | Senha e identificadores de sessão não serão persistidos em documentação, código ou commits. |
| Encerramento | A identidade e os dados do ensaio poderão ser removidos após a homologação. |

## Execução confirmada

A conta criada no Supabase de homologação possui o identificador `fbadecb3-b019-40ce-ad80-f95348828d8f`. A migration `20260814121000_bootstrap_president.sql` foi aplicada diretamente na conexão pooler de homologação após a tentativa pela interface não produzir persistência observável. Em seguida, o papel foi elevado a `admin`, conforme a autorização explícita para uma identidade administrativa temporária.

| Verificação | Resultado |
|---|---|
| Projeto consultado | `gfnbdjdqumewspvfxicl` somente |
| E-mail do perfil | `moises.754763@graduacao.fsa.br` |
| Papel | `admin` |
| `is_president` | `true` |
| Alteração em Production | Nenhuma |

## Massa mínima de checkout

Foi criada uma categoria e um produto ativos exclusivamente em `gfnbdjdqumewspvfxicl`, com nomes e SKU que explicitam sua finalidade de homologação. A massa permite que o RPC `create_checkout_order` faça reserva de estoque e que o webhook aprovado demonstre a baixa transacional. Não foi copiado qualquer produto, cliente, pedido ou estoque da produção.

| Recurso | Identificador técnico | Valor inicial |
|---|---|---|
| Categoria | `homologacao-mercado-pago` | Ativa, ordenação 999 |
| Produto | `teste-liquidacao-mercado-pago-20260817` | Ativo, SKU `HML-MP-20260817` |
| Produto ID | `f5375864-c3fc-4d1a-9413-27f553c159e0` | Preço de R$ 10,00 |
| Estoque inicial | Produto de teste | 5 unidades |

## Observação de disponibilidade no Preview

Na abertura de `https://atletica-g9ueq84fp-moises-faustino-rodrigues-s-projects.vercel.app/loja`, a vitrine apresentou os produtos publicados anteriores como indisponíveis e não exibiu o produto de homologação recém-criado. A criação no banco foi confirmada diretamente na conexão de homologação. Antes de disparar um checkout real, será necessário validar a origem de dados efetivamente usada por esse deployment e a sessão autenticada do usuário de teste, evitando qualquer risco de associar o ensaio a uma origem incorreta.
