import Link from "next/link";
import { ArrowRight, CalendarDays, ShoppingBag } from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";

export default function HomePage() {
  return (
    <main className="setup-screen">
      <nav className="setup-nav" aria-label="Navegação principal">
        <FsaWordmark />
        <div className="setup-nav-actions">
          <Link href="/eventos">Eventos</Link>
          <Link href="/loja" className="nav-cta">Loja</Link>
        </div>
      </nav>
      <section className="setup-hero">
        <div>
          <p className="eyebrow">PLATAFORMA INTEGRADA</p>
          <h1>ATLETICA FSA<br /><span>em movimento.</span></h1>
          <p className="setup-lede">A base da plataforma está sendo preparada: loja, eventos, pedidos, operação e gestão em um só ecossistema.</p>
          <div className="setup-actions">
            <Link href="/loja" className="button-primary"><ShoppingBag size={18} /> Conhecer a loja <ArrowRight size={18} /></Link>
            <Link href="/eventos" className="button-secondary"><CalendarDays size={18} /> Ver eventos</Link>
          </div>
        </div>
        <div className="mascot-placeholder" aria-label="Espaço reservado ao mascote coelho FSA">
          <div className="ear ear-left" />
          <div className="ear ear-right" />
          <div className="rabbit-face">
            <span className="eye-patch" />
            <span className="rabbit-eye" />
            <span className="rabbit-nose" />
          </div>
          <span className="mascot-jersey">FSA</span>
          <small>MASCOTE EM BREVE</small>
        </div>
      </section>
    </main>
  );
}
