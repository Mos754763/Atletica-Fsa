import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { FsaWordmark } from "@/components/brand/FsaWordmark";
import { formatBRL } from "@/lib/format";
import { EVENT_STATUS_LABEL, formatEventDate, getPublicEvents } from "@/lib/events";
import { registerForEvent } from "./actions";

export default async function EventsPage() {
  const events = await getPublicEvents();
  return <main className="events-page"><header className="catalog-nav catalog-nav--light"><Link href="/"><FsaWordmark /></Link><Link href="/" className="back-link back-link--light"><ArrowLeft size={17} /> Voltar ao início</Link></header>
    <section className="events-heading"><p className="eyebrow"><span /> AGENDA FSA</p><h1>É aqui que a<br /><em>história acontece.</em></h1><p>Inscrições, check-in e informações da nossa agenda reunidos em um único lugar.</p></section>
    <section className="event-list">{events.map((event, index) => <article className={`event-list-card event-list-card--${["blue", "yellow", "black"][index % 3]}`} key={event.id}><div className="event-list-card__date">{event.startsAt ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(event.startsAt)) : "EM BREVE"}</div><div><span>{EVENT_STATUS_LABEL[event.status]}</span><h2>{event.title}</h2><p>{event.description ?? "Detalhes deste encontro serão divulgados pela FSA."}</p><div className="event-list-card__info"><span><CalendarDays size={16} /> {formatEventDate(event.startsAt)}</span><span><MapPin size={16} /> {event.venue ?? "Local a confirmar"}</span></div></div>{event.status === "inscricoes_abertas" && event.requiresRegistration ? <form action={registerForEvent}><input type="hidden" name="eventId" value={event.id} /><button aria-label={`Inscrever em ${event.title}`}>{event.registrationPriceCents > 0 ? formatBRL(event.registrationPriceCents) : "Inscrever"} <ArrowRight size={20} /></button></form> : <span className="event-list-card__status">{EVENT_STATUS_LABEL[event.status]}</span>}</article>)}{events.length === 0 && <div className="events-empty"><Ticket size={31} /><strong>Nenhum evento publicado no momento.</strong><span>Acompanhe as redes da FSA para a próxima chamada.</span></div>}</section>
    <section className="events-cta"><Ticket size={24} /><div><strong>Não perca a próxima chamada.</strong><span>Cadastre-se para acompanhar os lançamentos da agenda.</span></div><Link href="/login">Criar minha conta <ArrowRight size={16} /></Link></section></main>;
}
