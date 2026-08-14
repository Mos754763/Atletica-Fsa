# Operação do catálogo e das imagens

## Fonte única de verdade

Produtos, preços, disponibilidade, destaque e imagens são mantidos no ERP em **ERP → Catálogo**. A landing page e a página `/loja` consultam a mesma fonte de dados (`products`, `product_images` e categorias), de modo que uma alteração confirmada no CMS é refletida nas duas superfícies públicas após a revalidação de cache.

> A pré-visualização do CMS é uma representação do produto público. Os links **Ver na landing** e **Abrir loja pública** servem para conferência final em uma nova aba.

## Procedimento de publicação

| Etapa | Ação no ERP | Controle aplicado |
|---|---|---|
| Criar | Cadastre nome, categoria, preço, estoque, disponibilidade e, se possível, uma foto. | Nome, preço e estoque são validados no servidor. |
| Enviar imagem | Selecione JPEG, PNG ou WebP, ou informe uma URL pública. | O arquivo é enviado ao bucket `catalog-assets`; o CMS associa a URL ao produto. |
| Organizar | Use **Usar como principal** para definir a primeira foto e remova fotos desnecessárias. | A imagem principal recebe ordem zero; arquivos próprios são removidos do Storage ao serem excluídos. |
| Editar | Atualize dados e marque/desmarque publicação e destaque. | Produto e ajuste de estoque ocorrem na RPC `update_catalog_product`, com histórico de inventário. |
| Arquivar | Desmarque **Disponível publicamente** para retirar da loja sem apagar o histórico. | Itens inativos deixam de ser retornados ao público. |
| Excluir | Confirme a exclusão apenas quando não houver dependências comerciais. | O servidor bloqueia produto com pedidos, reservas, itens de evento ou movimentos de estoque. |

## Imagens iniciais e auditoria

As imagens institucionais existentes de camiseta, copo, moletom e chaveiro foram publicadas no Storage do Supabase e vinculadas aos respectivos produtos sem sobrescrever fotos já cadastradas. Produtos sem fotografia continuam sinalizados no CMS para que a equipe envie a imagem real.

Para auditar as URLs cadastradas sem exibir chaves ou dados internos, execute:

```bash
pnpm audit:catalog-media
```

O relatório informa produto, existência de mídia, provedor, ordem e o resultado HTTP da URL. Ele considera como atenção apenas URLs inválidas ou indisponíveis; o estado `sem_imagem` é operacionalmente permitido, mas deve ser resolvido antes de promover um produto como destaque.

## Segurança e consistência

A edição de produto é permitida somente a quem já possui a permissão de gestão de catálogo. O ajuste de estoque é registrado em `inventory_movements` dentro da mesma operação que atualiza o produto; assim, não há uma atualização visível sem o respectivo evento de inventário.

O bucket de catálogo usa URLs públicas apenas para leitura de mídia. O upload, a troca de imagem principal e a exclusão de arquivos passam pelas ações protegidas do ERP. Não inclua credenciais, links assinados ou arquivos privados no campo de URL manual.
