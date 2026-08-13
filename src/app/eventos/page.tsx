import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";

const events = [
  { date: "EM BREVE", label: "Esportes", title: "Jogos universitários", copy: "A torcida FSA em quadra, no campo e nas arquibancadas.", color: "blue" },
  { date: "EM BREVE", label: "Social", title: "Festa da Atlética", copy: "Música, encontros e a energia que só a FSA entrega.", color: "yellow" },
  { date: "EM BREVE", label: "Eventos", title: "Copa FSA", copy: "Campeonato, integração e muito orgulho em jogo.", color: "black" },
];

export default function EventsPage() {
  return (
    <main className="events-page">
      <header className="catalog-nav catalog-nav--light"><Link href="/"><FsaWordmark /></Link><Link href="/" className="back-link back-link--light"><ArrowLeft size={17} /> Voltar ao início</Link></header>
      <section className="events-heading"><p className="eyebrow"><span /> AGENDA FSA</p><h1>É aqui que a<br /><em>história acontece.</em></h1><p>Inscrições, check-in e informações da nossa agenda reunidos em um único lugar.</p></section>
      <section className="event-list">
        {events.map((event) => <article className={`event-list-card event-list-card--${event.color}`} key={event.title}><div className="event-list-card__date">{event.date}</div><div><span>{event.label}</span><h2>{event.title}</h2><p>{event.copy}</p><div className="event-list-card__info"><span><CalendarDays size={16} /> Data será anunciada</span><span><MapPin size={16} /> FSA</span></div></div><button aria-label={`Ver ${event.title}`}><ArrowRight size={22} /></button></article>)}
      </section>
      <section className="events-cta"><Ticket size={24} /><div><strong>Não perca a próxima chamada.</strong><span>Cadastre-se para acompanhar os lançamentos da agenda.</span></div><Link href="/login">Criar minha conta <ArrowRight size={16} /></Link></section>
    </main>
  );
}
