import Link from "next/link";
import { CalendarCheck, Ticket } from "lucide-react";
import { formatBRL } from "@/lib/format";
import { formatEventDate } from "@/lib/events";
import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

type Registration = { id: string; status: string; check_in_code: string; amount_cents: number; events: { title: string; starts_at: string | null; venue: string | null } | null };

export default async function MyEventsPage() {
  const { supabase, userId } = await requireRole(["admin", "cozinha", "caixa", "cliente"]); const { data } = await supabase.from("event_registrations").select("id,status,check_in_code,amount_cents,events(title,starts_at,venue)").eq("customer_id", userId).order("created_at", { ascending: false }).returns<Registration[]>(); const registrations = data ?? [];
  return <main className="my-events-page"><p className="eyebrow eyebrow--blue">MINHAS INSCRIÇÕES</p><h1>Onde a FSA<br />vai estar.</h1><section>{registrations.map((registration) => <article key={registration.id}><CalendarCheck size={24} /><div><span>{registration.status.replaceAll("_", " ")}</span><h2>{registration.events?.title ?? "Evento FSA"}</h2><p>{formatEventDate(registration.events?.starts_at ?? null)} · {registration.events?.venue ?? "Local a confirmar"}</p></div><div><strong>{formatBRL(registration.amount_cents)}</strong><small>Código: {registration.check_in_code}</small></div></article>)}{registrations.length === 0 && <div className="my-events-empty"><Ticket size={28} /><strong>Você ainda não tem inscrições.</strong><Link href="/eventos">Explorar agenda FSA</Link></div>}</section></main>;
}
