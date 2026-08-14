import Link from "next/link";
import { CalendarCheck, Ticket } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { formatEventDate } from "@/lib/events";
import { requireRole } from "@/lib/auth/require-role";
import { EventTicketQrCode } from "@/components/events/EventTicketQrCode";
import { startEventCheckout, transferEventTicket } from "./actions";

export const dynamic = "force-dynamic";

type Registration = { id: string; status: string; check_in_code: string; amount_cents: number; events: { title: string; starts_at: string | null; venue: string | null } | null; event_tickets: { id: string; status: string }[] };

export default async function MyEventsPage() {
  const { supabase, userId } = await requireRole(["admin", "cozinha", "caixa", "cliente"]); const { data } = await supabase.from("event_registrations").select("id,status,check_in_code,amount_cents,events(title,starts_at,venue),event_tickets(id,status)").eq("customer_id", userId).order("created_at", { ascending: false }).returns<Registration[]>(); const registrations = data ?? [];
  return <main className="my-events-page"><p className="eyebrow eyebrow--blue">MEUS INGRESSOS</p><h1>Onde a FSA<br />vai estar.</h1><section>{registrations.map((registration) => { const ticket = registration.event_tickets[0]; const emitted = registration.status === "confirmada" && ticket?.status === "emitido"; return <article key={registration.id} className="my-event-ticket"><CalendarCheck size={24} /><div><span>{registration.status.replaceAll("_", " ")}</span><h2>{registration.events?.title ?? "Evento FSA"}</h2><p>{formatEventDate(registration.events?.starts_at ?? null)} · {registration.events?.venue ?? "Local a confirmar"}</p></div><div><strong>{formatBRL(registration.amount_cents)}</strong><small>Código: {registration.check_in_code}</small></div>{emitted && <div className="my-event-ticket__qr"><EventTicketQrCode checkInCode={registration.check_in_code} eventTitle={registration.events?.title ?? "Evento FSA"} /><span>Apresente este QR no check-in.</span></div>}{registration.status === "pendente" && <form action={startEventCheckout}><input type="hidden" name="registrationId" value={registration.id} /><button type="submit">Pagar ingresso</button></form>}{emitted && ticket && <form action={transferEventTicket} className="my-event-ticket__transfer"><input type="hidden" name="ticketId" value={ticket.id} /><label>Transferir para<input required name="recipientEmail" type="email" placeholder="email@exemplo.com" /></label><button type="submit">Transferir</button></form>}</article>; })}{registrations.length === 0 && <div className="my-events-empty"><Ticket size={28} /><strong>Você ainda não tem inscrições.</strong><Link href="/eventos">Explorar agenda FSA</Link></div>}</section></main>;
}
