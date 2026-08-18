"use client";

import Link from "next/link";
import { ArrowLeft, Eye, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import type { CatalogProduct, CatalogSalesBatch, CatalogVariant } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/client";
import { resolveFsaProductImage } from "@/lib/store-product-assets";

type StorefrontProps = { products: CatalogProduct[] };
type CartLine = { cartKey: string; productId: string; productName: string; imageUrl: string | null; variantId: string | null; variantName: string | null; salesBatchId: string | null; salesBatchName: string | null; unitPriceCents: number; maxQuantity: number; quantity: number };

const PREORDER_CART_LIMIT = 20;

export function Storefront({ products }: StorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [isCartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({});
  const [fulfillment, setFulfillment] = useState<"retirada" | "consumo_local">("retirada");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const categories = useMemo(() => Array.from(new Map(products.filter((product) => product.category).map((product) => [product.category!.slug, product.category!])).values()), [products]);
  const visibleProducts = selectedCategory === "todos" ? products : products.filter((product) => product.category?.slug === selectedCategory);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = cart.reduce((sum, item) => sum + (item.unitPriceCents * item.quantity), 0);

  function getVariant(product: CatalogProduct): CatalogVariant | null {
    const selected = selectedVariants[product.id] ?? product.variants[0]?.id;
    return product.variants.find((variant) => variant.id === selected) ?? null;
  }
  function getBatch(product: CatalogProduct): CatalogSalesBatch | null {
    const selected = selectedBatches[product.id];
    return product.salesBatches.find((batch) => batch.id === selected) ?? null;
  }
  function addToCart(product: CatalogProduct) {
    const variant = getVariant(product); const batch = getBatch(product);
    if (product.hasVariants && !variant) { setPaymentNotice("Escolha uma variação antes de adicionar este produto."); return; }
    const maxQuantity = batch ? PREORDER_CART_LIMIT : variant ? variant.stockQuantity : product.stockQuantity;
    if (maxQuantity < 1) { setPaymentNotice("Este produto não possui estoque disponível no momento."); return; }
    const unitPriceCents = batch?.priceCents ?? variant?.priceCents ?? product.priceCents;
    const cartKey = [product.id, variant?.id ?? "base", batch?.id ?? "pronta-entrega"].join(":");
    setCart((current) => {
      const previous = current.find((item) => item.cartKey === cartKey);
      if (!previous) return [...current, { cartKey, productId: product.id, productName: product.name, imageUrl: product.imageUrl, variantId: variant?.id ?? null, variantName: variant?.name ?? null, salesBatchId: batch?.id ?? null, salesBatchName: batch?.name ?? null, unitPriceCents, maxQuantity, quantity: 1 }];
      if (previous.quantity >= previous.maxQuantity) return current;
      return current.map((item) => item.cartKey === cartKey ? { ...item, quantity: item.quantity + 1 } : item);
    });
    setPaymentNotice(null); setSelectedProduct(null); setCartOpen(true);
  }
  function changeQuantity(cartKey: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.cartKey !== cartKey) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, item.maxQuantity) }] : [];
    }));
  }
  async function startCheckout() {
    setCheckingOut(true); setPaymentNotice(null);
    try {
      const supabase = createClient(); const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) { window.location.assign("/login?next=/loja"); return; }
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ fulfillment, items: cart.map((item) => ({ productId: item.productId, variantId: item.variantId ?? undefined, salesBatchId: item.salesBatchId ?? undefined, quantity: item.quantity })) }) });
      const body = await response.json() as { checkoutUrl?: string; error?: string };
      if (!response.ok || !body.checkoutUrl) throw new Error(body.error ?? "Não foi possível iniciar o checkout.");
      window.location.assign(body.checkoutUrl);
    } catch (checkoutError) { setPaymentNotice(checkoutError instanceof Error ? checkoutError.message : "Não foi possível iniciar o pagamento."); } finally { setCheckingOut(false); }
  }
  function renderProductOptions(product: CatalogProduct, compact = false) {
    const variant = getVariant(product); const batch = getBatch(product);
    return <>
      {product.variants.length > 0 && <label className="store-product__option">Variação<select value={variant?.id ?? ""} onChange={(event) => setSelectedVariants((current) => ({ ...current, [product.id]: event.target.value }))}>{product.variants.map((option) => <option value={option.id} key={option.id}>{option.name}{option.stockQuantity > 0 ? "" : " — esgotado"}</option>)}</select></label>}
      {product.salesBatches.length > 0 && <label className="store-product__option">{compact ? "Disponibilidade" : "Lote de pré-venda"}<select value={batch?.id ?? ""} onChange={(event) => setSelectedBatches((current) => ({ ...current, [product.id]: event.target.value }))}><option value="">Pronta entrega</option>{product.salesBatches.map((option) => <option value={option.id} key={option.id}>{option.name}{option.closesAt ? ` — encerra ${new Date(option.closesAt).toLocaleDateString("pt-BR")}` : ""}</option>)}</select></label>}
      {batch && <p className="store-product__batch">Pré-venda: consulte a retirada após o pagamento.</p>}
    </>;
  }

  return <main className="store-page">
    <header className="store-nav">
      <Link href="/" className="store-nav__brand">ATLETICA <strong>FSA</strong></Link>
      <nav aria-label="Navegação da loja"><Link className="store-nav__events" href="/eventos">Eventos</Link><button type="button" className="store-cart-trigger" onClick={() => setCartOpen(true)}><ShoppingBag size={17} /> Carrinho {totalQuantity > 0 && <b>{totalQuantity}</b>}</button></nav>
    </header>
    <aside className="store-rail" aria-label="Atalhos de navegação"><Link href="/"><ArrowLeft size={16} /> Início</Link><Link href="/eventos">Eventos</Link><button type="button" onClick={() => setCartOpen(true)}><ShoppingBag size={16} /> Ver carrinho</button></aside>
    <section className="store-hero"><p className="eyebrow eyebrow--blue"><span /> LOJA OFICIAL</p><h1>Vista a <em>torcida.</em></h1><p>Produtos, copos e aquele toque FSA para representar dentro e fora dos eventos.</p></section>
    <nav className="store-filters" aria-label="Filtrar produtos por categoria"><button aria-pressed={selectedCategory === "todos"} className={selectedCategory === "todos" ? "is-active" : ""} type="button" onClick={() => setSelectedCategory("todos")}>Todos</button>{categories.map((category) => <button aria-pressed={selectedCategory === category.slug} className={selectedCategory === category.slug ? "is-active" : ""} type="button" key={category.id} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}</nav>
    <section className="store-grid" aria-live="polite">
      {visibleProducts.map((product, index) => {
        const variant = getVariant(product); const batch = getBatch(product); const productPrice = batch?.priceCents ?? variant?.priceCents ?? product.priceCents; const available = batch ? true : (variant?.stockQuantity ?? product.stockQuantity) > 0;
        return <article className="store-product fx-spotlight" key={product.id}>
          <button type="button" className={`store-product__visual store-product__visual--${index % 6}`} onClick={() => setSelectedProduct(product)} aria-label={`Ver detalhes de ${product.name}`}>
            {resolveFsaProductImage(product.name, product.imageUrl) ? <img src={resolveFsaProductImage(product.name, product.imageUrl)!} alt={product.name} loading={index < 4 ? "eager" : "lazy"} decoding="async" /> : <span>FSA</span>}{product.isFeatured && <small>DESTAQUE</small>}<i><Eye size={17} /> Ver produto</i>
          </button>
          <div className="store-product__body"><span>{product.category?.name ?? "FSA"}</span><button type="button" className="store-product__title" onClick={() => setSelectedProduct(product)}><h2>{product.name}</h2></button><p>{product.description ?? "Produto oficial da ATLETICA FSA."}</p>{renderProductOptions(product)}</div>
          <footer><strong>{formatBRL(productPrice)}</strong><button type="button" disabled={!available} onClick={() => addToCart(product)}>{!available ? "Indisponível" : <><ShoppingBag size={17} /> Adicionar</>}</button></footer>
        </article>;
      })}
    </section>
    {selectedProduct && (() => { const variant = getVariant(selectedProduct); const batch = getBatch(selectedProduct); const price = batch?.priceCents ?? variant?.priceCents ?? selectedProduct.priceCents; const available = batch ? true : (variant?.stockQuantity ?? selectedProduct.stockQuantity) > 0; return <div className="store-detail" role="dialog" aria-modal="true" aria-labelledby="store-detail-title" aria-describedby="store-detail-description"><button className="store-detail__backdrop" type="button" aria-label="Fechar detalhes" onClick={() => setSelectedProduct(null)} /><article className="store-detail__panel"><button type="button" className="store-detail__close" onClick={() => setSelectedProduct(null)} aria-label="Fechar detalhes"><X size={21} /></button><div className="store-detail__image">{resolveFsaProductImage(selectedProduct.name, selectedProduct.imageUrl) ? <img src={resolveFsaProductImage(selectedProduct.name, selectedProduct.imageUrl)!} alt={selectedProduct.name} /> : <span>FSA</span>}</div><div className="store-detail__content"><p className="eyebrow eyebrow--blue"><span /> {selectedProduct.category?.name ?? "LOJA FSA"}</p><h2 id="store-detail-title">{selectedProduct.name}</h2><p id="store-detail-description">{selectedProduct.description ?? "Produto oficial da ATLETICA FSA."}</p>{renderProductOptions(selectedProduct, true)}<div className="store-detail__buy"><strong>{formatBRL(price)}</strong><button type="button" disabled={!available} onClick={() => addToCart(selectedProduct)}>{available ? <><ShoppingBag size={17} /> Adicionar ao carrinho</> : "Indisponível"}</button></div><small>{available ? "Estoque e disponibilidade confirmados ao finalizar o pedido." : "Este item está esgotado no momento."}</small></div></article></div>; })()}
    <aside className={`store-cart ${isCartOpen ? "is-open" : ""}`} aria-hidden={!isCartOpen} aria-label="Carrinho de compras"><button className="store-cart__backdrop" type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)} /><div className="store-cart__panel"><header><div><span>SEU PEDIDO</span><h2>Partiu retirada.</h2></div><button type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)}><X size={21} /></button></header>{cart.length === 0 ? <div className="store-cart__empty"><ShoppingBag size={28} /><strong>Seu carrinho está vazio.</strong><p>Escolha os produtos da FSA para começar um pedido.</p><button type="button" onClick={() => setCartOpen(false)}>Ver produtos</button></div> : <><div className="store-cart__items">{cart.map((item) => <article key={item.cartKey}><div className="store-cart__thumb">{resolveFsaProductImage(item.productName, item.imageUrl) ? <img src={resolveFsaProductImage(item.productName, item.imageUrl)!} alt="" loading="eager" decoding="async" /> : "FSA"}</div><div><h3>{item.productName}</h3>{item.variantName && <small>{item.variantName}</small>}{item.salesBatchName && <small>Pré-venda: {item.salesBatchName}</small>}<span>{formatBRL(item.unitPriceCents)}</span><div className="store-cart__quantity"><button type="button" onClick={() => changeQuantity(item.cartKey, -1)} aria-label={`Remover uma unidade de ${item.productName}`}><Minus size={14} /></button><b>{item.quantity}</b><button type="button" onClick={() => changeQuantity(item.cartKey, 1)} aria-label={`Adicionar uma unidade de ${item.productName}`}><Plus size={14} /></button></div></div><button className="store-cart__remove" type="button" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.cartKey !== item.cartKey))} aria-label={`Remover ${item.productName}`}><Trash2 size={16} /></button></article>)}</div><footer><div className="store-cart__fulfillment"><span>Como você quer receber?</span><div><button type="button" aria-pressed={fulfillment === "retirada"} className={fulfillment === "retirada" ? "is-selected" : ""} onClick={() => setFulfillment("retirada")}>Retirada</button><button type="button" aria-pressed={fulfillment === "consumo_local"} className={fulfillment === "consumo_local" ? "is-selected" : ""} onClick={() => setFulfillment("consumo_local")}>Consumir no local</button></div></div><div><span>Total</span><strong>{formatBRL(totalCents)}</strong></div><button type="button" className="store-cart__checkout" aria-busy={checkingOut} disabled={checkingOut} onClick={() => void startCheckout()}>{checkingOut ? "Abrindo Mercado Pago..." : "Reservar estoque e pagar"}</button>{paymentNotice && <p className="store-cart__notice" role="status">{paymentNotice}</p>}<small>O estoque é reservado por 15 minutos e o pagamento é processado pelo Mercado Pago.</small></footer></>}</div></aside>
  </main>;
}
