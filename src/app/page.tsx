import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Handshake,
  Instagram,
  Menu,
  Package,
  ShoppingBag,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { SectionTitle } from "@/components/landing/SectionTitle";
import { institutionalAsset } from "@/lib/institutional-assets";

const instagramUrl = "https://www.instagram.com/atleticafsa/";
const heroArtwork = institutionalAsset("fsa-hero-gestao-2026.png");
const storeArtwork = institutionalAsset("fsa-store-pattern.png");
const eventArtwork = institutionalAsset("fsa-events-pattern.png");

const sectors = [
  { number: "01", name: "Suprimentos", copy: "Tudo para a torcida chegar junto." },
  { number: "02", name: "Eventos", copy: "Experiências que viram história." },
  { number: "03", name: "Sociais", copy: "A conexão que move a FSA." },
  { number: "04", name: "Marketing", copy: "Orgulho que ganha voz." },
  { number: "05", name: "Esportes", copy: "Raça dentro e fora da quadra." },
];

const products = [
  { name: "Camiseta Oficial", category: "Vestuário", price: "R$ 69,90", className: "product-art--shirt" },
  { name: "Copo FSA", category: "Acessórios", price: "R$ 24,90", className: "product-art--cup" },
  { name: "Moletom Titular", category: "Vestuário", price: "R$ 149,90", className: "product-art--hoodie" },
  { name: "Chaveiro Coelho", category: "Colecionáveis", price: "R$ 14,90", className: "product-art--keychain" },
];

const capabilities = [
  { icon: ShoppingBag, label: "Loja online", copy: "Seu pedido, seu ritmo." },
  { icon: CalendarDays, label: "Eventos", copy: "Inscrição e check-in em um lugar." },
  { icon: Package, label: "Retire sem fila", copy: "Pediu no celular, buscou com a gente." },
];

const management = [
  { name: "Rafa", role: "Presidente da Atlética", image: institutionalAsset("gestao-2026/presidente-rafa.webp") },
  { name: "Bella", role: "Assessora do Presidente", image: institutionalAsset("gestao-2026/assessora-bella.webp") },
  { name: "Maju", role: "Diretora de Marketing", image: institutionalAsset("gestao-2026/diretora-marketing-maju.webp") },
  { name: "Malu", role: "Diretora de Eventos", image: institutionalAsset("gestao-2026/diretora-eventos-malu.webp") },
  { name: "Leca", role: "Diretora de Sociais", image: institutionalAsset("gestao-2026/diretora-sociais-leca.webp") },
  { name: "Raposo", role: "Diretora de Suprimentos", image: institutionalAsset("gestao-2026/diretora-suprimentos-raposo.webp") },
  { name: "Pietro", role: "Diretor de Esportes", image: institutionalAsset("gestao-2026/diretor-esportes-pietro.webp") },
  { name: "Belote", role: "Diretor de Bateria", image: institutionalAsset("gestao-2026/diretor-bateria-belote.webp") },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero-shell" id="inicio">
        <nav className="site-nav page-width" aria-label="Navegação principal">
          <Link href="/" aria-label="ATLETICA FSA - Página inicial"><FsaWordmark /></Link>
          <div className="site-nav__links">
            <a href="#setores">Setores</a>
            <a href="#gestao">Gestão</a>
            <a href="#loja">Loja</a>
            <a href="#eventos">Eventos</a>
            <Link href="/login" className="nav-login">Entrar</Link>
          </div>
          <button className="nav-menu" aria-label="Abrir menu"><Menu size={21} /></button>
        </nav>

        <div className="hero page-width">
          <div className="hero__copy">
            <p className="eyebrow"><span /> UMA SÓ TORCIDA. UM SÓ GRITO.</p>
            <h1>VESTE.<br />VIVE.<br /><em>VENCE.</em></h1>
            <p className="hero__lede">A ATLETICA FSA transforma a energia da faculdade em esporte, conexão e experiências para levar com você.</p>
            <div className="hero__actions">
              <Link href="/loja" className="button button--yellow"><ShoppingBag size={18} /> Ir para a loja <ArrowRight size={17} /></Link>
              <a href="#eventos" className="button button--ghost"><CalendarDays size={18} /> Próximos eventos</a>
            </div>
            <div className="hero__signal"><span className="pulse-dot" /> Plataforma integrada <ArrowDownRight size={17} /></div>
          </div>
          <div className="hero__mascot-wrap">
            <span className="hero__yellow-orb" />
            <span className="hero__outline hero__outline--one">FSA</span>
            <span className="hero__outline hero__outline--two">FSA</span>
            <img className="hero__official-art" src={heroArtwork} alt="Mascote institucional da ATLETICA FSA para a gestão 2026" />
            <div className="hero__badge"><strong>2026</strong><span>GESTÃO<br />FSA</span></div>
          </div>
        </div>
        <div className="hero-ticker" aria-label="Destaques da ATLETICA FSA">
          <span>JOGOS</span><i /> <span>FESTAS</span><i /> <span>CAMPEONATOS</span><i /> <span>TORCIDA</span><i /> <span>LOJA OFICIAL</span><i /> <span>JOGOS</span><i /> <span>FESTAS</span>
        </div>
      </section>

      <section className="capability-strip">
        <div className="page-width capability-grid">
          {capabilities.map(({ icon: Icon, label, copy }) => (
            <div className="capability" key={label}><Icon aria-hidden="true" /><div><strong>{label}</strong><span>{copy}</span></div></div>
          ))}
          <Link className="capability-link" href="/login">Acessar minha conta <ChevronRight size={18} /></Link>
        </div>
      </section>

      <section className="sector-section page-width" id="setores">
        <SectionTitle eyebrow="A FSA É MUITO MAIS" title="Cinco frentes. A mesma vibração." copy="Da arquibancada ao próximo grande evento, cada setor deixa sua marca." />
        <div className="sector-grid">
          {sectors.map((sector) => (
            <article className="sector-card" key={sector.number}>
              <span>{sector.number}</span><ArrowDownRight size={24} /><h3>{sector.name}</h3><p>{sector.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="management-section" id="gestao">
        <div className="page-width">
          <div className="management-heading">
            <SectionTitle eyebrow="GESTÃO 2026" title="Quem move a FSA." copy="Conheça os rostos da gestão que transforma organização, torcida e experiências em movimento." />
            <div className="management-heading__actions"><img className="management-section__seal" src={institutionalAsset("gestao-2026/selo-e-mascote.webp")} alt="Selo oficial da ATLETICA FSA" /><a href={instagramUrl} target="_blank" rel="noreferrer" className="text-link management-heading__link"><Instagram size={18} /> Ver no Instagram <ArrowRight size={18} /></a></div>
          </div>
          <div className="management-grid">
            {management.map((member) => (
              <article className="management-card" key={member.name}>
                <div className="management-card__photo"><img src={member.image} alt={`${member.name}, ${member.role}, na gestão 2026 da ATLETICA FSA`} /></div>
                <div><span>GESTÃO 2026</span><h3>{member.name}</h3><p>{member.role}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="store-section" id="loja">
        <img className="store-section__art" src={storeArtwork} alt="" aria-hidden="true" />
        <div className="page-width store-section__content">
          <div className="store-heading">
            <SectionTitle eyebrow="LOJA DA TORCIDA" title="Seu jeito de levar a FSA com você." inverted />
            <Link href="/loja" className="text-link text-link--light">Ver todos os produtos <ArrowRight size={18} /></Link>
          </div>
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.name}>
                <div className={`product-art ${product.className}`} aria-hidden="true"><span className="product-art__fsa">FSA</span></div>
                <div className="product-card__meta"><span>{product.category}</span><button aria-label={`Adicionar ${product.name} ao carrinho`}><ShoppingBag size={17} /></button></div>
                <h3>{product.name}</h3><strong>{product.price}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="event-section page-width" id="eventos">
        <div className="event-poster event-poster--official"><img src={eventArtwork} alt="Arte institucional de eventos da ATLETICA FSA" /><span className="event-poster__top">NOITE<br />FSA</span><span className="event-poster__date">EM<br />BREVE</span></div>
        <div className="event-copy">
          <p className="eyebrow eyebrow--blue"><span /> AGENDA FSA</p>
          <h2>O próximo capítulo começa com a gente.</h2>
          <p>Jogos, campeonatos, festas e encontros para fazer a história acontecer. Inscreva-se, retire seus itens e viva cada momento com a FSA.</p>
          <div className="event-copy__details"><span><CalendarDays size={18} /> Agenda sempre atualizada</span><span><UsersRound size={18} /> Check-in rápido e seguro</span></div>
          <Link href="/eventos" className="button button--blue">Explorar eventos <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="manifesto-section">
        <div className="page-width manifesto-layout">
          <div className="manifesto-symbol"><Trophy size={52} /><span>FSA</span></div>
          <blockquote>“A gente não acompanha. A gente <em>move</em>.”</blockquote>
          <div className="manifesto-meta"><Sparkles size={20} /> MAIS QUE UMA ATLÉTICA<br />UMA COMUNIDADE</div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="page-width footer-grid">
          <div><FsaWordmark /><p>Esporte, festa, amizade e tradição. Tudo em azul, amarelo e muita atitude.</p></div>
          <div className="footer-links"><strong>Explore</strong><Link href="/loja">Loja</Link><Link href="/eventos">Eventos</Link><a href="#setores">Setores</a></div>
          <div className="footer-links"><strong>Acesso</strong><Link href="/login">Minha conta</Link><Link href="/admin">Backoffice</Link><Link href="/ods">ODS</Link></div>
          <a className="instagram-link" href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram da ATLETICA FSA"><Instagram size={20} /> Seguir a FSA</a>
        </div>
        <div className="page-width footer-bottom"><span>© 2026 ATLETICA FSA</span><span>FEITO PARA QUEM TORCE JUNTO.</span><Handshake size={17} /></div>
      </footer>
    </main>
  );
}
