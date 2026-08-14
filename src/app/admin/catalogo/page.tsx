import Link from "next/link";
import { ArrowLeft, Boxes, Filter, FolderPlus, Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { createCategory, createProduct, createSalesBatch, createVariant } from "./actions";

export const dynamic = "force-dynamic";

type Category = { id: string; name: string; slug: string };
type Product = { id: string; name: string; sku: string | null; price_cents: number; stock_quantity: number; is_active: boolean; categories: { name: string } | null };
type ProductVariantOption = { id: string; name: string; product_id: string; products: { name: string } | null };
type SearchParams = Promise<{ q?: string; category?: string; availability?: string }>;

export default async function CatalogAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase(); const selectedCategory = params.category ?? "all"; const availability = ["all", "active", "hidden", "low_stock"].includes(params.availability ?? "") ? params.availability! : "all";
  const { supabase } = await requireRole(["admin", "caixa"]);
  const [{ data: categories }, { data: products }, { data: variants }] = await Promise.all([
    supabase.from("categories").select("id,name,slug").order("sort_order").returns<Category[]>(),
    supabase.from("products").select("id,name,sku,price_cents,stock_quantity,is_active,categories(name)").order("created_at", { ascending: false }).returns<Product[]>(),
    supabase.from("product_variants").select("id,name,product_id,products(name)").eq("is_active", true).order("name").returns<ProductVariantOption[]>(),
  ]);
  const categoryList = categories ?? [];
  const productList = products ?? [];
  const variantList = variants ?? [];
  const filteredProducts = productList.filter((product) => (selectedCategory === "all" || product.categories?.name === selectedCategory) && (availability === "all" || availability === "active" && product.is_active || availability === "hidden" && !product.is_active || availability === "low_stock" && product.stock_quantity <= 5) && (!q || [product.name, product.sku, product.categories?.name].filter(Boolean).join(" ").toLowerCase().includes(q)));

  return <main className="cms-page">
    <header className="cms-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / CATÁLOGO</p><h1>Produtos em campo.</h1></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="cms-stats"><article><Boxes size={23} /><span><strong>{productList.length}</strong><small>produtos cadastrados</small></span></article><article><FolderPlus size={23} /><span><strong>{categoryList.length}</strong><small>categorias ativas</small></span></article></section>
    <section className="cms-layout"><div className="cms-forms">
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Novo produto</h2></div><form action={createProduct} className="cms-form">
        <label>Nome<input name="name" required placeholder="Ex.: Regata FSA" /></label>
        <div className="cms-form__split"><label>SKU<input name="sku" placeholder="FSA-REG-001" /></label><label>Categoria<select name="categoryId" defaultValue=""><option value="">Sem categoria</option>{categoryList.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}</select></label></div>
        <label>Descrição<textarea name="description" placeholder="Detalhes e características do produto" /></label>
        <div className="cms-form__split"><label>Preço (centavos)<input name="priceCents" required min="0" type="number" placeholder="6990" /></label><label>Estoque inicial<input name="stockQuantity" required min="0" type="number" defaultValue="0" /></label></div>
        <label>Enviar foto (JPG, PNG ou WEBP — até 5 MB)<input name="imageFile" type="file" accept="image/jpeg,image/png,image/webp" /></label>
        <label>Ou URL da imagem<input name="imageUrl" type="url" placeholder="https://..." /></label>
        <label className="cms-check"><input name="isFeatured" type="checkbox" /> Exibir como destaque</label><button type="submit">Salvar produto</button>
      </form></article>
      <article className="cms-card cms-card--small"><div className="cms-card__title"><FolderPlus size={18} /><h2>Nova categoria</h2></div><form action={createCategory} className="cms-inline-form"><input name="name" required placeholder="Ex.: Acessórios" /><button type="submit">Criar</button></form><p>As fotos são enviadas pelo servidor ao bucket <strong>catalog-assets</strong>, compatível com o protocolo S3 do Supabase.</p></article>
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Nova variação</h2></div><form action={createVariant} className="cms-form"><label>Produto<select name="productId" required defaultValue=""><option value="" disabled>Selecione um produto</option>{productList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><div className="cms-form__split"><label>Nome<input name="name" required placeholder="Ex.: Tamanho M" /></label><label>SKU<input name="sku" placeholder="FSA-CAM-M" /></label></div><div className="cms-form__split"><label>Preço (centavos)<input name="priceCents" min="0" type="number" placeholder="Usar preço do produto" /></label><label>Estoque inicial<input name="stockQuantity" required min="0" type="number" defaultValue="0" /></label></div><label>Atributos<input name="attributes" placeholder="Ex.: Tamanho: M" /></label><button type="submit">Salvar variação</button></form></article>
      <article className="cms-card"><div className="cms-card__title"><Plus size={18} /><h2>Pré-venda em rascunho</h2></div><form action={createSalesBatch} className="cms-form"><label>Produto<select name="productId" required defaultValue=""><option value="" disabled>Selecione um produto</option>{productList.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label>Variação específica (opcional)<select name="variantId" defaultValue=""><option value="">Todas as variações</option>{variantList.map((variant) => <option key={variant.id} value={variant.id}>{variant.products?.name ?? "Produto"} — {variant.name}</option>)}</select></label><label>Nome do lote<input name="name" required placeholder="Ex.: 1º lote — Pré-venda" /></label><div className="cms-form__split"><label>Preço (centavos)<input name="priceCents" min="0" type="number" placeholder="Usar preço padrão" /></label><label>Mínimo de peças<input name="minimumQuantity" min="1" type="number" /></label></div><div className="cms-form__split"><label>Abre em<input name="opensAt" type="datetime-local" /></label><label>Encerra em<input name="closesAt" type="datetime-local" /></label></div><label>Instruções<textarea name="instructions" placeholder="Prazo, retirada e condição do lote" /></label><button type="submit">Criar rascunho</button><p>O lote permanece em rascunho até a política de sinal e estorno ser definida pela diretoria.</p></form></article>
    </div>
      <section className="cms-table-card"><div className="cms-table-card__head"><div><span>INVENTÁRIO</span><h2>Catálogo atual</h2></div><span>{filteredProducts.length} itens</span></div><form className="data-filterbar data-filterbar--catalog" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Produto, SKU ou categoria" /></label><label><span>Categoria</span><select name="category" defaultValue={selectedCategory}><option value="all">Todas as categorias</option>{categoryList.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}</select></label><label><span>Disponibilidade</span><select name="availability" defaultValue={availability}><option value="all">Todos os itens</option><option value="active">Ativos</option><option value="hidden">Ocultos</option><option value="low_stock">Estoque baixo (≤5)</option></select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/catalogo">Limpar</Link></form><div className="cms-table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th></tr></thead><tbody>{filteredProducts.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.sku ?? "Sem SKU"}</small></td><td>{product.categories?.name ?? "—"}</td><td>{formatBRL(product.price_cents)}</td><td>{product.stock_quantity}</td><td><span className={product.is_active ? "status-dot is-active" : "status-dot"}>{product.is_active ? "Ativo" : "Oculto"}</span></td></tr>)}{filteredProducts.length === 0 && <tr><td colSpan={5} className="cms-empty">Nenhum produto corresponde aos filtros.</td></tr>}</tbody></table></div></section></section></main>;
}
