"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import type { CatalogProduct } from "@/lib/catalog";

type StorefrontProps = { products: CatalogProduct[] };
type CartLine = CatalogProduct & { quantity: number };

export function Storefront({ products }: StorefrontProps) {
  const [selectedCategory, setSelectedCategory] = useState("todos");
  const [isCartOpen, setCartOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [fulfillment, setFulfillment] = useState<"retirada" | "consumo_local">("retirada");
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const categories = useMemo(() => Array.from(new Map(products.filter((product) => product.category).map((product) => [product.category!.slug, product.category!])).values()), [products]);
  const visibleProducts = selectedCategory === "todos" ? products : products.filter((product) => product.category?.slug === selectedCategory);
  const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCents = cart.reduce((sum, item) => sum + (item.priceCents * item.quantity), 0);

  function addToCart(product: CatalogProduct) {
    if (product.stockQuantity < 1) return;
    setCart((current) => {
      const previous = current.find((item) => item.id === product.id);
      if (!previous) return [...current, { ...product, quantity: 1 }];
      if (previous.quantity >= product.stockQuantity) return current;
      return current.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
    });
    setCartOpen(true);
  }

  function changeQuantity(productId: string, delta: number) {
    setCart((current) => current.flatMap((item) => {
      if (item.id !== productId) return [item];
      const quantity = item.quantity + delta;
      return quantity > 0 ? [{ ...item, quantity: Math.min(quantity, item.stockQuantity) }] : [];
    }));
  }

  return (
    <main className="store-page">
      <header className="store-nav">
        <Link href="/" className="store-nav__brand">ATLETICA <strong>FSA</strong></Link>
        <div><Link href="/eventos">Eventos</Link><button type="button" className="store-cart-trigger" onClick={() => setCartOpen(true)}><ShoppingBag size={17} /> Carrinho {totalQuantity > 0 && <b>{totalQuantity}</b>}</button></div>
      </header>
      <section className="store-hero">
        <p className="eyebrow eyebrow--blue"><span /> LOJA OFICIAL</p>
        <h1>Vista a <em>torcida.</em></h1>
        <p>Produtos, copos e aquele toque FSA para representar dentro e fora dos eventos.</p>
      </section>
      <nav className="store-filters" aria-label="Filtrar produtos por categoria">
        <button className={selectedCategory === "todos" ? "is-active" : ""} type="button" onClick={() => setSelectedCategory("todos")}>Todos</button>
        {categories.map((category) => <button className={selectedCategory === category.slug ? "is-active" : ""} type="button" key={category.id} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}
      </nav>
      <section className="store-grid" aria-live="polite">
        {visibleProducts.map((product, index) => (
          <article className="store-product" key={product.id}>
            <div className={`store-product__visual store-product__visual--${index % 6}`}>
              {product.imageUrl ? <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 760px) 50vw, 25vw" /> : <span>FSA</span>}
              {product.isFeatured && <small>DESTAQUE</small>}
            </div>
            <div className="store-product__body"><span>{product.category?.name ?? "FSA"}</span><h2>{product.name}</h2><p>{product.description ?? "Produto oficial da ATLETICA FSA."}</p></div>
            <footer><strong>{formatBRL(product.priceCents)}</strong><button type="button" disabled={product.stockQuantity < 1} onClick={() => addToCart(product)}>{product.stockQuantity < 1 ? "Indisponível" : <><ShoppingBag size={17} /> Adicionar</>}</button></footer>
          </article>
        ))}
      </section>

      <aside className={`store-cart ${isCartOpen ? "is-open" : ""}`} aria-label="Carrinho de compras">
        <button className="store-cart__backdrop" type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)} />
        <div className="store-cart__panel"><header><div><span>SEU PEDIDO</span><h2>Partiu retirada.</h2></div><button type="button" aria-label="Fechar carrinho" onClick={() => setCartOpen(false)}><X size={21} /></button></header>
          {cart.length === 0 ? <div className="store-cart__empty"><ShoppingBag size={28} /><strong>Seu carrinho está vazio.</strong><p>Escolha os produtos da FSA para começar um pedido.</p></div> : <><div className="store-cart__items">{cart.map((item) => <article key={item.id}><div className="store-cart__thumb">FSA</div><div><h3>{item.name}</h3><span>{formatBRL(item.priceCents)}</span><div className="store-cart__quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)} aria-label={`Remover uma unidade de ${item.name}`}><Minus size={14} /></button><b>{item.quantity}</b><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Adicionar uma unidade de ${item.name}`}><Plus size={14} /></button></div></div><button className="store-cart__remove" type="button" onClick={() => setCart((current) => current.filter((cartItem) => cartItem.id !== item.id))} aria-label={`Remover ${item.name}`}><Trash2 size={16} /></button></article>)}</div><footer><div className="store-cart__fulfillment"><span>Como você quer receber?</span><div><button type="button" className={fulfillment === "retirada" ? "is-selected" : ""} onClick={() => setFulfillment("retirada")}>Retirada</button><button type="button" className={fulfillment === "consumo_local" ? "is-selected" : ""} onClick={() => setFulfillment("consumo_local")}>Consumir no local</button></div></div><div><span>Total</span><strong>{formatBRL(totalCents)}</strong></div><button type="button" className="store-cart__checkout" onClick={() => setPaymentNotice(`Seu pedido para ${fulfillment === "retirada" ? "retirada" : "consumo no local"} está pronto. O pagamento Mercado Pago será liberado assim que as credenciais forem configuradas.`)}>Continuar para pagamento</button>{paymentNotice && <p className="store-cart__notice" role="status">{paymentNotice}</p>}<small>Checkout seguro com Mercado Pago será ativado ao configurar as credenciais de pagamento.</small></footer></>}
        </div>
      </aside>
    </main>
  );
}
