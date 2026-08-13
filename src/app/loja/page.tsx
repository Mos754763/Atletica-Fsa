import Link from "next/link";
import { ArrowLeft, ArrowRight, ShoppingBag } from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";

const items = [
  ["Camiseta Oficial", "Vestuário", "R$ 69,90", "product-art--shirt"],
  ["Moletom Titular", "Vestuário", "R$ 149,90", "product-art--hoodie"],
  ["Copo FSA", "Acessórios", "R$ 24,90", "product-art--cup"],
  ["Chaveiro Coelho", "Colecionáveis", "R$ 14,90", "product-art--keychain"],
  ["Shorts Treino", "Vestuário", "R$ 59,90", "product-art--shorts"],
  ["Figurinhas FSA", "Colecionáveis", "R$ 8,00", "product-art--cards"],
];

export default function StorePage() {
  return (
    <main className="catalog-page">
      <header className="catalog-nav"><Link href="/"><FsaWordmark /></Link><Link href="/" className="back-link"><ArrowLeft size={17} /> Voltar ao início</Link></header>
      <section className="catalog-heading"><p className="eyebrow eyebrow--blue"><span /> LOJA OFICIAL</p><h1>Vista a <em>torcida.</em></h1><p>Uma prévia do catálogo da FSA. O carrinho e o pagamento serão habilitados na próxima fase.</p></section>
      <div className="catalog-filter"><span>Todos</span><button>Vestuário</button><button>Acessórios</button><button>Colecionáveis</button><button>Bebidas</button></div>
      <section className="catalog-grid">
        {items.map(([name, category, price, art]) => <article className="catalog-item" key={name}><div className={`product-art ${art}`}><span className="product-art__fsa">FSA</span></div><span>{category}</span><h2>{name}</h2><div><strong>{price}</strong><button aria-label={`Em breve: adicionar ${name}`}><ShoppingBag size={18} /></button></div></article>)}
      </section>
      <section className="catalog-banner"><span>QUER VENDER COM A FSA?</span><p>Em breve, pedidos e retirada pelo celular.</p><Link href="/eventos">Conhecer os eventos <ArrowRight size={16} /></Link></section>
    </main>
  );
}
