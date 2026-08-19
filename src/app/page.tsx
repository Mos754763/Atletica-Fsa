import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Handshake,
  Instagram,
  Package,
  ShoppingBag,
  Sparkles,
  Trophy,
  UsersRound,
} from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { SectionTitle } from "@/components/landing/SectionTitle";
import { FloatingParticles, HeroMotion, HighlightParallax, MagneticLink, MotionButton, MotionCard, MotionReveal, ParallaxArtwork } from "@/components/landing/LandingMotion";
import { ManagementCarousel } from "@/components/landing/ManagementCarousel";
import { MobileNav } from "@/components/landing/MobileNav";
import { institutionalAsset } from "@/lib/institutional-assets";
import { getCatalog } from "@/lib/catalog";
import { formatBRL } from "@/lib/format";

const instagramUrl = "https://www.instagram.com/atleticafsa/";
const heroArtwork = institutionalAsset("fsa-hero-gestao-2026.png");
const storeArtwork = institutionalAsset("fsa-store-pattern.png");
const eventArtwork = institutionalAsset("fsa-events-pattern.png");

const sectors = [
  { number: "01", name: "Suprimentos", copy: "Tudo para a torcida chegar junto.", image: institutionalAsset("sectors/fsa-sector-suprimentos.png") },
  { number: "02", name: "Eventos", copy: "Experiências que viram história.", image: institutionalAsset("sectors/fsa-sector-eventos.png") },
  { number: "03", name: "Sociais", copy: "A conexão que move a FSA.", image: institutionalAsset("sectors/fsa-sector-sociais.png") },
  { number: "04", name: "Marketing", copy: "Orgulho que ganha voz.", image: institutionalAsset("sectors/fsa-sector-marketing.png") },
  { number: "05", name: "Esportes", copy: "Raça dentro e fora da quadra.", image: institutionalAsset("sectors/fsa-sector-esportes.png") },
];

const capabilities = [
  { icon: ShoppingBag, label: "Loja online", copy: "Seu pedido, seu ritmo." },
  { icon: CalendarDays, label: "Eventos", copy: "Inscrição e check-in em um lugar." },
  { icon: Package, label: "Retire sem fila", copy: "Pediu no celular, buscou com a gente." },
];

const management = [
  { name: "Rafa", role: "Presidente da Atlética", image: institutionalAsset("gestao-2026-clean/rafa.webp") },
  { name: "Bella", role: "Assessora do Presidente", image: institutionalAsset("gestao-2026-clean/bella.webp") },
  { name: "Maju", role: "Diretora de Marketing", image: institutionalAsset("gestao-2026-clean/maju.webp") },
  { name: "Malu", role: "Diretora de Eventos", image: institutionalAsset("gestao-2026-clean/malu.webp") },
  { name: "Leca", role: "Diretora de Sociais", image: institutionalAsset("gestao-2026-clean/leca.webp") },
  { name: "Raposo", role: "Diretora de Suprimentos", image: institutionalAsset("gestao-2026-clean/raposo.webp") },
  { name: "Pietro", role: "Diretor de Esportes", image: institutionalAsset("gestao-2026-clean/pietro.webp") },
  { name: "Belote", role: "Diretor de Bateria", image: institutionalAsset("gestao-2026-clean/belote.webp") },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalog();
  const products = catalog.filter((product) => product.isFeatured).slice(0, 4);
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
          <MobileNav />
        </nav>

        <div className="hero page-width">
          <div className="hero__copy">
            <p className="eyebrow"><span /> UMA SÓ TORCIDA. UM SÓ GRITO.</p>
            <h1>VESTE.<br />VIVE.<br /><em>VENCE.</em></h1>
            <p className="hero__lede">A ATLETICA FSA transforma a energia da faculdade em esporte, conexão e experiências para levar com você.</p>
            <div className="hero__actions">
              <MagneticLink href="/loja" className="button button--yellow"><ShoppingBag size={18} /> Ir para a loja <ArrowRight size={17} /></MagneticLink>
              <a href="#eventos" className="button button--ghost"><CalendarDays size={18} /> Próximos eventos</a>
            </div>
          </div>
              <HeroMotion artwork={heroArtwork} />
        </div>
        <div className="hero-ticker" aria-label="Destaques da ATLETICA FSA">
          <div className="hero-ticker__track" aria-hidden="true">
            <div className="hero-ticker__group"><span>JOGOS</span><i /><span>FESTAS</span><i /><span>CAMPEONATOS</span><i /><span>TORCIDA</span><i /><span>LOJA OFICIAL</span><i /></div>
            <div className="hero-ticker__group"><span>JOGOS</span><i /><span>FESTAS</span><i /><span>CAMPEONATOS</span><i /><span>TORCIDA</span><i /><span>LOJA OFICIAL</span><i /></div>
          </div>
        </div>
      </section>

      <section className="capability-strip capability-strip--motion">
        <FloatingParticles />
        <HighlightParallax><div className="page-width capability-grid">
          {capabilities.map(({ icon: Icon, label, copy }, index) => (
            <MotionReveal className="capability motion-reveal" delay={index * 0.06} key={label}><Icon aria-hidden="true" /><div><strong>{label}</strong><span>{copy}</span></div></MotionReveal>
          ))}
          <Link className="capability-link" href="/login">Acessar minha conta <ChevronRight size={18} /></Link>
        </div></HighlightParallax>
      </section>

      <section className="sector-section page-width" id="setores">
        <MotionReveal className="motion-reveal"><SectionTitle eyebrow="A FSA É MUITO MAIS" title="Cinco frentes. A mesma vibração." copy="Da arquibancada ao próximo grande evento, cada setor deixa sua marca." /></MotionReveal>
        <div className="sector-grid">
          {sectors.map((sector, index) => (
            <MotionCard className="sector-card motion-card" delay={index * 0.05} key={sector.number}>
              <div className="sector-card__photo" aria-hidden="true"><img src={sector.image} alt="" loading="lazy" /></div>
              <div className="sector-card__content"><span>{sector.number}</span><ArrowDownRight size={24} /><h3>{sector.name}</h3><p>{sector.copy}</p></div>
            </MotionCard>
          ))}
        </div>
      </section>

      <section className="management-section" id="gestao">
        <div className="page-width">
          <MotionReveal className="management-heading motion-reveal">
            <SectionTitle eyebrow="GESTÃO 2026" title="Quem move a FSA." copy="Conheça os rostos da gestão que transforma organização, torcida e experiências em movimento." />
            <div className="management-heading__actions"><img className="management-section__seal" src={institutionalAsset("gestao-2026/selo-e-mascote.webp")} alt="Selo oficial da ATLETICA FSA" /><a href={instagramUrl} target="_blank" rel="noreferrer" className="text-link management-heading__link"><Instagram size={18} /> Ver no Instagram <ArrowRight size={18} /></a></div>
          </MotionReveal>
          <ManagementCarousel people={management} />
        </div>
      </section>

      <section className="store-section" id="loja">
        <ParallaxArtwork className="store-section__art" src={storeArtwork} />
        <div className="page-width store-section__content">
          <MotionReveal className="store-heading motion-reveal">
            <SectionTitle eyebrow="LOJA DA TORCIDA" title="Seu jeito de levar a FSA com você." inverted />
            <Link href="/loja" className="text-link text-link--light">Ver todos os produtos <ArrowRight size={18} /></Link>
          </MotionReveal>
          <div className="product-grid">
            {products.map((product, index) => (
              <MotionCard className="product-card motion-card" delay={index * 0.07} key={product.id}>
                <div className="product-art">{product.imageUrl ? <img className="product-art__image" src={product.imageUrl} alt={`${product.name} da ATLETICA FSA`} /> : <span className="product-art__fallback">FSA</span>}</div>
                <div className="product-card__meta"><span>{product.category?.name ?? "Produtos FSA"}</span><MotionButton label={`Adicionar ${product.name} ao carrinho`}><ShoppingBag size={17} /></MotionButton></div>
                <h3>{product.name}</h3><strong>{formatBRL(product.priceCents)}</strong>
              </MotionCard>
            ))}
            {products.length === 0 && <p className="store-section__empty">Nenhum destaque disponível agora. Acompanhe a loja oficial para conhecer os próximos produtos.</p>}
          </div>
        </div>
      </section>

      <section className="event-section page-width" id="eventos">
        <MotionReveal className="event-poster event-poster--official motion-reveal"><img src={eventArtwork} alt="Arte institucional de eventos da ATLETICA FSA" /><span className="event-poster__top">NOITE<br />FSA</span><span className="event-poster__date">EM<br />BREVE</span></MotionReveal>
        <MotionReveal className="event-copy motion-reveal" delay={0.08}>
          <p className="eyebrow eyebrow--blue"><span /> AGENDA FSA</p>
          <h2>O próximo capítulo começa com a gente.</h2>
          <p>Jogos, campeonatos, festas e encontros para fazer a história acontecer. Inscreva-se, retire seus itens e viva cada momento com a FSA.</p>
          <div className="event-copy__details"><span><CalendarDays size={18} /> Agenda sempre atualizada</span><span><UsersRound size={18} /> Check-in rápido e seguro</span></div>
          <Link href="/eventos" className="button button--blue">Explorar eventos <ArrowRight size={17} /></Link>
        </MotionReveal>
      </section>

      <section className="manifesto-section">
        <MotionReveal className="page-width manifesto-layout motion-reveal">
          <div className="manifesto-symbol"><Trophy size={52} /><span>FSA</span></div>
          <blockquote>“A gente não acompanha. A gente <em>move</em>.”</blockquote>
          <div className="manifesto-meta"><Sparkles size={20} /> MAIS QUE UMA ATLÉTICA<br />UMA COMUNIDADE</div>
        </MotionReveal>
      </section>

      <footer className="site-footer">
        <div className="page-width footer-grid">
          <div><FsaWordmark /><p>Esporte, festa, amizade e tradição. Tudo em azul, amarelo e muita atitude.</p></div>
          <div className="footer-links"><strong>Explore</strong><Link href="/loja">Loja</Link><Link href="/eventos">Eventos</Link><a href="#setores">Setores</a></div>
          <div className="footer-links"><strong>Acesso</strong><Link href="/login">Minha conta</Link></div>
          <a className="instagram-link" href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram da ATLETICA FSA"><Instagram size={20} /> Seguir a FSA</a>
        </div>
        <div className="page-width footer-bottom"><span>© 2026 ATLETICA FSA</span><span>FEITO PARA QUEM TORCE JUNTO.</span><Handshake size={17} /></div>
      </footer>
    </main>
  );
}
