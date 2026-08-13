import Link from "next/link";
import { ArrowLeft, Boxes, FolderPlus, Plus } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { createCategory, createProduct } from "./actions";

export const dynamic = "force-dynamic";

type Category = { id: string; name: string; slug: string };
type Product = { id: string; name: string; sku: string | null; price_cents: number; stock_quantity: number; is_active: boolean; categories: { name: string } | null };

export default async function CatalogAdminPage() {
  const { supabase } = await requireRole(["admin", "caixa"]);
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id,name,slug").order("sort_order").returns<Category[]>(),
    supabase.from("products").select("id,name,sku,price_cents,stock_quantity,is_active,categories(name)").order("created_at", { ascending: false }).returns<Product[]>(),
  ]);
  const categoryList = categories ?? [];
  const productList = products ?? [];

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
    </div>
      <section className="cms-table-card"><div className="cms-table-card__head"><div><span>INVENTÁRIO</span><h2>Catálogo atual</h2></div><span>{productList.length} itens</span></div><div className="cms-table-wrap"><table><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th></tr></thead><tbody>{productList.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{product.sku ?? "Sem SKU"}</small></td><td>{product.categories?.name ?? "—"}</td><td>{formatBRL(product.price_cents)}</td><td>{product.stock_quantity}</td><td><span className={product.is_active ? "status-dot is-active" : "status-dot"}>{product.is_active ? "Ativo" : "Oculto"}</span></td></tr>)}{productList.length === 0 && <tr><td colSpan={5} className="cms-empty">Nenhum produto cadastrado ainda.</td></tr>}</tbody></table></div></section></section></main>;
}
