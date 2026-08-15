import Link from "next/link";
import { ArrowLeft, CalendarPlus, ClipboardCheck, Filter, Users } from "lucide-react";
import { EVENT_STATUS_LABEL, formatEventDate } from "@/lib/events";
import { formatBRL } from "@/lib/format";
import { requireRole } from "@/lib/auth/require-role";
import { checkInRegistration, createEvent, createTicketLot, moveEventStatus, setTicketLotActive } from "./actions";

export const dynamic = "force-dynamic";

type EventRegistration = {
  id: string;
  attendee_name: string;
  attendee_email: string | null;
  amount_cents: number;
  source: "plataforma" | "sympla" | "manual";
  status: "pendente" | "confirmada" | "check_in_realizado" | "cancelada";
  payments: { status: string }[] | null;
};
type ManagedEvent = {
  id: string;
  title: string;
  status: "divulgando" | "inscricoes_abertas" | "em_andamento" | "encerrado";
  starts_at: string | null;
  venue: string | null;
  registration_price_cents: number;
  capacity: number | null;
  requires_registration: boolean;
  external_provider: "sympla" | null;
  external_url: string | null;
  event_registrations: EventRegistration[];
  event_ticket_lots: { id: string; name: string; price_cents: number; quantity_total: number; quantity_sold: number; is_active: boolean }[];
};
const nextStatus = { divulgando: "inscricoes_abertas", inscricoes_abertas: "em_andamento", em_andamento: "encerrado" } as const;
type SearchParams = Promise<{ q?: string; status?: string }>;

function paymentState(registration: EventRegistration) {
  if (registration.amount_cents === 0) return { label: "Gratuito", tone: "free" };
  if ((registration.payments ?? []).some((payment) => payment.status === "aprovado")) return { label: "Pago", tone: "paid" };
  return { label: "Pendente", tone: "pending" };
}

function eventMetrics(registrations: EventRegistration[]) {
  return {
    total: registrations.length,
    paid: registrations.filter((registration) => paymentState(registration).tone === "paid").length,
    pending: registrations.filter((registration) => paymentState(registration).tone === "pending").length,
    free: registrations.filter((registration) => paymentState(registration).tone === "free").length,
    sympla: registrations.filter((registration) => registration.source === "sympla").length,
  };
}

export default async function AdminEventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().toLowerCase();
  const selectedStatus = ["all", "divulgando", "inscricoes_abertas", "em_andamento", "encerrado"].includes(params.status ?? "") ? params.status! : "all";
  const { supabase } = await requireRole(["admin"]);
  const { data } = await supabase.from("events").select("id,title,status,starts_at,venue,registration_price_cents,capacity,requires_registration,external_provider,external_url,event_registrations(id,attendee_name,attendee_email,amount_cents,source,status,payments(status)),event_ticket_lots(id,name,price_cents,quantity_total,quantity_sold,is_active)").order("starts_at", { ascending: false, nullsFirst: false }).returns<ManagedEvent[]>();
  const events = data ?? [];
  const visibleEvents = events.filter((event) => (selectedStatus === "all" || event.status === selectedStatus) && (!q || [event.title, event.venue].filter(Boolean).join(" ").toLowerCase().includes(q)));

  return <main className="events-admin-page">
    <header className="events-admin-header"><div><p className="eyebrow eyebrow--blue">BACKOFFICE / EVENTOS</p><h1>Agenda e operação.</h1></div><Link href="/admin"><ArrowLeft size={16} /> Painel</Link></header>
    <section className="events-admin-layout">
      <article className="event-form-card"><div className="event-form-card__title"><CalendarPlus size={19} /><h2>Novo evento</h2></div><form action={createEvent}>
        <label>Título<input required name="title" placeholder="Ex.: Copa FSA" /></label><label>Descrição<textarea name="description" placeholder="O que acontece neste evento?" /></label>
        <div><label>Início<input name="startsAt" type="datetime-local" /></label><label>Encerramento<input name="endsAt" type="datetime-local" /></label></div><label>Local<input name="venue" placeholder="Ex.: Ginásio FSA" /></label>
        <div><label>Capacidade<input name="capacity" type="number" min="1" placeholder="Sem limite" /></label><label>Preço da inscrição (R$)<input name="priceBrl" inputMode="decimal" placeholder="0,00 = gratuito" defaultValue="0,00" /></label></div>
        <label className="event-check"><input type="checkbox" name="requiresRegistration" /> Exigir inscrição ou ingresso</label><p>Com inscrição ativa, <strong>R$ 0,00</strong> emite ingresso gratuito; valores maiores ficam pendentes até a confirmação do pagamento.</p><button type="submit">Criar como divulgando</button>
      </form></article>
      <section className="event-operations">
        <div className="event-operations__head"><div><span>EVENTOS CADASTRADOS</span><h2>{events.length} na agenda</h2></div><form action={checkInRegistration} className="checkin-form"><ClipboardCheck size={16} /><input name="checkInCode" placeholder="Código ou QR de check-in interno" /><button type="submit">Validar</button></form></div>
        <form className="data-filterbar data-filterbar--compact" method="get"><label><span>Buscar</span><input name="q" defaultValue={q} placeholder="Evento ou local" /></label><label><span>Status</span><select name="status" defaultValue={selectedStatus}><option value="all">Todos os status</option>{Object.entries(EVENT_STATUS_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="submit"><Filter size={15} /> Filtrar</button><Link href="/admin/eventos">Limpar</Link></form>
        {visibleEvents.map((event) => {
          const metrics = eventMetrics(event.event_registrations);
          return <article className="managed-event" key={event.id}>
            <div className={`managed-event__flag status-${event.status}`}><span>{event.external_provider ? "SYMPLA" : EVENT_STATUS_LABEL[event.status]}</span></div>
            <div className="managed-event__content"><h3>{event.title}</h3><p>{formatEventDate(event.starts_at)} · {event.venue ?? "Local a confirmar"}</p>
              <div className="event-registration-metrics"><span><Users size={14} /> {metrics.total}{event.capacity ? `/${event.capacity}` : ""} inscritos</span><span className="is-paid">{metrics.paid} pagos</span><span className="is-pending">{metrics.pending} pendentes</span><span className="is-free">{metrics.free} gratuitos</span>{metrics.sympla > 0 && <span className="is-sympla">{metrics.sympla} Sympla</span>}</div>
              {event.external_provider && <div className="managed-event__source"><span>Evento espelhado da Sympla. Inscrições importadas mantêm sua origem e situação financeira.</span>{event.external_url && <a href={event.external_url} target="_blank" rel="noreferrer">Abrir na Sympla</a>}</div>}
              {!event.external_provider && <><div className="event-price-note">{event.requires_registration ? event.registration_price_cents === 0 ? "Inscrição gratuita" : `Ingresso padrão ${formatBRL(event.registration_price_cents)}` : "Sem inscrição obrigatória"}</div><details className="event-lots"><summary>Ingressos e lotes ({event.event_ticket_lots.length})</summary><div>{event.event_ticket_lots.map((lot) => <div key={lot.id}><span>{lot.name} · {formatBRL(lot.price_cents)} · {lot.quantity_sold}/{lot.quantity_total}</span><form action={setTicketLotActive}><input type="hidden" name="lotId" value={lot.id} /><input type="hidden" name="active" value={String(!lot.is_active)} /><button type="submit">{lot.is_active ? "Ocultar" : "Publicar"}</button></form></div>)}</div><form action={createTicketLot} className="event-lots__form"><input type="hidden" name="eventId" value={event.id} /><input required name="name" placeholder="Nome do lote" /><input required name="priceCents" type="number" min="0" placeholder="Preço em centavos" /><input required name="quantityTotal" type="number" min="1" placeholder="Quantidade" /><button type="submit">Criar rascunho</button></form></details></>}
              <details className="event-registration-details"><summary>Ver inscrições e pagamentos ({metrics.total})</summary>{metrics.total === 0 ? <p>Nenhuma inscrição sincronizada para este evento.</p> : <div className="event-registration-table"><div className="event-registration-table__head"><span>Participante</span><span>Origem</span><span>Inscrição</span><span>Pagamento</span></div>{event.event_registrations.map((registration) => { const payment = paymentState(registration); return <div key={registration.id}><span><strong>{registration.attendee_name}</strong><small>{registration.attendee_email ?? "E-mail não informado"}</small></span><span>{registration.source === "sympla" ? "Sympla" : registration.source === "manual" ? "Lançamento manual" : "Plataforma FSA"}</span><span>{registration.status.replaceAll("_", " ")}</span><span className={`payment-state payment-state--${payment.tone}`}>{payment.label}</span></div>; })}</div>}</details>
            </div>
            {!event.external_provider && event.status !== "encerrado" && <form action={moveEventStatus}><input type="hidden" name="eventId" value={event.id} /><input type="hidden" name="nextStatus" value={nextStatus[event.status]} /><button type="submit">{nextStatus[event.status] === "inscricoes_abertas" ? "Abrir inscrições" : nextStatus[event.status] === "em_andamento" ? "Iniciar evento" : "Encerrar"}</button></form>}
          </article>;
        })}
        {visibleEvents.length === 0 && <div className="event-admin-empty">Nenhum evento corresponde aos filtros.</div>}
      </section>
    </section>
  </main>;
}
