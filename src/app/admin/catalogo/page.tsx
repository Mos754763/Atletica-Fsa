import Link from "next/link";
import { ArrowLeft, Boxes, Eye, Filter, FolderPlus, ImagePlus, PencilLine, Plus, Star, Trash2, Upload } from "lucide-react";
import { centsToBrlInput } from "@/lib/money";
import { formatBRL } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { resolveFsaProductImage } from "@/lib/store-product-assets";
import { addProductImage, createCategory, createProduct, createSalesBatch, createVariant, deleteProduct, deleteProductImage, setPrimaryProductImage, updateProduct } from "./actions";

export const dynamic = "force-dynamic";

type Category = { id: string; name: string; slug: string };
type ProductImage = { id: string; public_url: string; alt_text: string | null; sort_order: number };
type Product = {
  id: string; name: string; sku: string | null; description: string | null; price_cents: number; stock_quantity: number;
  is_active: boolean; is_featured: boolean; categories: { id: string; name: string; slug: string } | null; product_images: ProductImage[] | null;
};
type ProductVariantOption = { id: string; name: string; product_id: string; products: { name: string } | null };
type SearchParams = Promise<{ q?: string; category?: string; availability?: string }>;

function productImage(product: Product) {
  const mainImage = [...(product.product_images ?? [])].sort((left, right) => left.sort_order - right.sort_order)[0]?.public_url ?? null;
  return resolveFsaProductImage(product.name, mainImage);
}

export default async function CatalogAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const selectedCategory = params.category ?? "all";
  const availability = ["all", "active", "hidden", "low_stock"].includes(params.availability ?? "") ? params.availability! : "all";
  const { supabase } = await requireRole(["admin", "caixa"]);
  const [{ data: categories }, { data: products }, { data: variants }] = await Promise.all([
    supabase.from("categories").select("id,name,slug").order("sort_order").returns<Category[]>(),
    supabase.from("products").select("id,name,sku,description,price_cents,stock_quantity,is_active,is_featured,categories(id,name,slug),product_images(id,public_url,alt_text,sort_order)").order("created_at", { ascending: false }).returns<Product[]>(),
    supabase.from("product_variants").select("id,name,product_id,products(name)").eq("is_active", true).order("name").returns<ProductVariantOption[]>(),
  ]);
  const categoryList = categories ?? [];
  const productList = products ?? [];
  const variantList = variants ?? [];
  const filteredProducts = productList.filter((product) => (selectedCategory === "all" || product.categories?.name === selectedCategory)
    && (availability === "all" || availability === "active" && product.is_active || availability === "hidden" && !product.is_active || availability === "low_stock" && product.stock_quantity <= 5)
    && (!q || [product.name, product.sku, product.categories?.name].filter(Boolean).join(" ").toLowerCase().includes(q)));
  const landingPreview = productList.filter((product) => product.is_active && product.is_featured).slice(0, 4);
  const storePreview = productList.filter((product) => product.is_active).slice(0, 6);

  return <main className="cms-page">
    <header className="cms-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / CATÁLOGO</p><h1>Produtos em campo.</h1><p className="cms-header__copy">Uma única origem para fotos, estoque, landing page e loja oficial.</p></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="cms-stats"><article><Boxes size={23} /><span><strong>{productList.length}</strong><small>produtos cadastrados</small></span></article><article><FolderPlus size={23} /><span><strong>{categoryList.length}</strong><small>categorias ativas</small></span></article><article><ImagePlus size={23} /><span><strong>{productList.reduce((total, product) => total + (product.product_images?.length ?? 0), 0)}</strong><small>fotos organizadas</small></span></article></section>
    <section className="cms-layout"><div className="cms-forms">
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Novo produto</h2></div><form action={createProduct} className="cms-form" encType="multipart/form-data">
        <label>Nome<input name="name" required placeholder="Ex.: Regata FSA" /></label>
        <div className="cms-form__split"><label>SKU<input name="sku" placeholder="FSA-REG-001" /></label><label>Categoria<select name="categoryId" defaultValue=""><option value="">Sem categoria</option>{categoryList.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div>
        <label>Descrição<textarea name="description" placeholder="Detalhes e características do produto" /></label>
        <div className="cms-form__split"><label>Preço (R$)<input name="priceBrl" required min="0" step="0.01" inputMode="decimal" type="text" placeholder="69,90" /></label><label>Estoque inicial<input name="stockQuantity" required min="0" type="number" defaultValue="0" /></label></div>
        <label>Enviar foto (JPG, PNG ou WEBP — até 5 MB)<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label>Ou URL da imagem<input name="imageUrl" type="url" placeholder="https://..." /></label>
        <label className="cms-check"><input name="isFeatured" type="checkbox" /> Exibir como destaque na landing</label><button type="submit">Salvar produto</button>
      </form></article>
      <article className="cms-card cms-card--small"><div className="cms-card__title"><FolderPlus size={18} /><h2>Nova categoria</h2></div><form action={createCategory} className="cms-inline-form"><input name="name" required placeholder="Ex.: Acessórios" /><button type="submit">Criar</button></form><p>As fotos são enviadas pelo servidor ao bucket público <strong>catalog-assets</strong>. A primeira foto é a imagem principal da landing e da loja.</p></article>
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Nova variação</h2></div><form action={createVariant} className="cms-form"><label>Produto<select name="productId" required defaultValue=""><option value="" disabled>Selecione um produto</option>{productList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="cms-form__split"><label>Nome<input name="name" required placeholder="Ex.: Tamanho M" /></label><label>SKU<input name="sku" placeholder="FSA-CAM-M" /></label></div><div className="cms-form__split"><label>Preço (R$, opcional)<input name="priceBrl" min="0" step="0.01" inputMode="decimal" type="text" placeholder="Usar preço do produto" /></label><label>Estoque inicial<input name="stockQuantity" required min="0" type="number" defaultValue="0" /></label></div><label>Atributos<input name="attributes" placeholder="Ex.: Tamanho: M" /></label><button type="submit">Salvar variação</button></form></article>
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Pré-venda em rascunho</h2></div><form action={createSalesBatch} className="cms-form"><label>Produto<select name="productId" required defaultValue=""><option value="" disabled>Selecione um produto</option>{productList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Variação específica (opcional)<select name="variantId" defaultValue=""><option value="">Todas as variações</option>{variantList.map((variant) => <option key={variant.id} value={variant.id}>{variant.products?.name ?? "Produto"} — {variant.name}</option>)}</select></label><label>Nome do lote<input name="name" required placeholder="Ex.: 1º lote — Pré-venda" /></label><div className="cms-form__split"><label>Preço (R$, opcional)<input name="priceBrl" min="0" step="0.01" inputMode="decimal" type="text" placeholder="Usar preço padrão" /></label><label>Mínimo de peças<input name="minimumQuantity" min="1" type="number" /></label></div><div className="cms-form__split"><label>Abre em<input name="opensAt" type="datetime-local" /></label><label>Encerra em<input name="closesAt" type="datetime-local" /></label></div><label>Instruções<textarea name="instructions" placeholder="Prazo, retirada e condição do lote" /></label><button type="submit">Criar rascunho</button><p>O lote permanece em rascunho até a política de sinal e estorno ser definida pela diretoria.</p></form></article>
    </div>
      <div className="cms-catalog-column">
        <section className="cms-preview-card"><div className="cms-preview-card__head"><div><span>PRÉ-VISUALIZAÇÃO AO VIVO</span><h2>Como o catálogo aparece</h2></div><div className="cms-preview-card__links"><Link href="/" target="_blank"><Eye size={14} /> Landing</Link><Link href="/loja" target="_blank"><Eye size={14} /> Loja</Link></div></div>
          <div className="cms-preview-groups"><div><p>DESTAQUES DA LANDING</p><div className="cms-preview-strip">{landingPreview.length ? landingPreview.map((product) => <CatalogPreviewCard key={product.id} product={product} />) : <span className="cms-preview-empty">Marque até quatro produtos como destaque.</span>}</div></div><div><p>CATÁLOGO DA LOJA</p><div className="cms-preview-strip">{storePreview.length ? storePreview.map((product) => <CatalogPreviewCard key={product.id} product={product} />) : <span className="cms-preview-empty">Cadastre e ative produtos para vê-los aqui.</span>}</div></div></div>
        </section>
        <section className="cms-table-card"><div className="cms-table-card__head"><div><span>INVENTÁRIO</span><h2>Catálogo atual</h2></div><span>{filteredProducts.length} itens</span></div><form className="data-filterbar data-filterbar--catalog" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Produto, SKU ou categoria" /></label><label><span>Categoria</span><select name="category" defaultValue={selectedCategory}><option value="all">Todas as categorias</option>{categoryList.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label><span>Disponibilidade</span><select name="availability" defaultValue={availability}><option value="all">Todos os itens</option><option value="active">Ativos</option><option value="hidden">Ocultos</option><option value="low_stock">Estoque baixo (≤5)</option></select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/catalogo">Limpar</Link></form>
          <div className="cms-product-list">{filteredProducts.map((product) => <ProductManager key={product.id} product={product} categories={categoryList} />)}{filteredProducts.length === 0 && <div className="cms-empty">Nenhum produto corresponde aos filtros.</div>}</div>
        </section>
      </div>
    </section>
  </main>;
}

function CatalogPreviewCard({ product }: { product: Product }) {
  const image = productImage(product);
  return <article className="cms-preview-product"><div>{image ? <img src={image} alt="" /> : <span>FSA</span>}</div><strong>{product.name}</strong><small>{formatBRL(product.price_cents)}</small></article>;
}

function ProductManager({ product, categories }: { product: Product; categories: Category[] }) {
  const images = [...(product.product_images ?? [])].sort((left, right) => left.sort_order - right.sort_order);
  const mainImage = productImage(product);
  return <details className="cms-product-manager"><summary><div className="cms-product-manager__summary-image">{mainImage ? <img src={mainImage} alt="" /> : <span>FSA</span>}</div><div className="cms-product-manager__summary-copy"><strong>{product.name}</strong><small>{product.sku ?? "Sem SKU"} · {product.categories?.name ?? "Sem categoria"}</small></div><div className="cms-product-manager__metrics"><span>{formatBRL(product.price_cents)}</span><span>{product.stock_quantity} em estoque</span></div><div className="cms-product-manager__badges">{product.is_featured && <span><Star size={12} /> Destaque</span>}<span className={product.is_active ? "status-dot is-active" : "status-dot"}>{product.is_active ? "Ativo" : "Oculto"}</span></div><PencilLine size={17} /></summary>
    <div className="cms-product-manager__body"><section><h3>Dados do produto</h3><form action={updateProduct} className="cms-form cms-form--edit"><input type="hidden" name="productId" value={product.id} /><label>Nome<input name="name" required defaultValue={product.name} /></label><div className="cms-form__split"><label>SKU<input name="sku" defaultValue={product.sku ?? ""} /></label><label>Categoria<select name="categoryId" defaultValue={product.categories?.id ?? ""}><option value="">Sem categoria</option>{categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div><label>Descrição<textarea name="description" defaultValue={product.description ?? ""} /></label><div className="cms-form__split"><label>Preço (R$)<input name="priceBrl" required min="0" step="0.01" inputMode="decimal" type="text" defaultValue={centsToBrlInput(product.price_cents)} /></label><label>Estoque atual<input name="stockQuantity" required min="0" type="number" defaultValue={product.stock_quantity} /></label></div><div className="cms-form__toggles"><label className="cms-check"><input name="isActive" type="checkbox" defaultChecked={product.is_active} /> Disponível publicamente</label><label className="cms-check"><input name="isFeatured" type="checkbox" defaultChecked={product.is_featured} /> Destaque da landing</label></div><button type="submit">Atualizar produto</button></form></section>
      <section><h3>Fotos e imagem principal</h3><div className="cms-image-gallery">{images.map((image, index) => <article className="cms-image-card" key={image.id}><img src={image.public_url} alt={image.alt_text ?? `Foto ${index + 1} de ${product.name}`} /><div><small>{index === 0 ? "Imagem principal" : `Foto ${index + 1}`}</small><div>{index !== 0 && <form action={setPrimaryProductImage}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="imageId" value={image.id} /><button type="submit">Usar como principal</button></form>}<form action={deleteProductImage}><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="imageId" value={image.id} /><button className="cms-button--danger" type="submit">Remover</button></form></div></div></article>)}{images.length === 0 && <p className="cms-image-empty">Sem foto cadastrada. A loja poderá mostrar apenas uma arte institucional de contingência quando aplicável.</p>}</div><form action={addProductImage} className="cms-upload-form" encType="multipart/form-data"><input type="hidden" name="productId" value={product.id} /><label><Upload size={15} /> Nova foto<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" /></label><label>ou URL<input name="imageUrl" type="url" placeholder="https://..." /></label><label>Texto alternativo<input name="altText" defaultValue={product.name} /></label><button type="submit">Adicionar foto</button></form></section>
      <section className="cms-product-manager__danger"><h3>Excluir produto</h3><p>Use a exclusão somente para cadastros sem operação vinculada. Para itens já vendidos, desmarque “Disponível publicamente” para preservar o histórico.</p><form action={deleteProduct}><input type="hidden" name="productId" value={product.id} /><label className="cms-check"><input name="confirmDelete" type="checkbox" value="excluir" required /> Entendo que esta ação não pode ser desfeita.</label><button className="cms-button--danger" type="submit"><Trash2 size={15} /> Excluir cadastro</button></form></section>
    </div>
  </details>;
}
