import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { processEmailOutbox, sendTransactionalEmail } from "@/lib/email/transactional";
import { formatEventDate } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const start = new Date(); start.setHours(start.getHours() + 23); const end = new Date(); end.setHours(end.getHours() + 25);
  const supabase = createServiceClient(); const { data: events } = await supabase.from("events").select("id,title,starts_at,venue").gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).in("status", ["inscricoes_abertas", "em_andamento"]);
  let queued = 0;
  for (const event of events ?? []) { const { data: registrations } = await supabase.from("event_registrations").select("id,attendee_email,customer_id").eq("event_id", event.id).in("status", ["confirmada", "check_in_realizado"]); for (const registration of registrations ?? []) { if (!registration.attendee_email) continue; const result = await sendTransactionalEmail({ to: registration.attendee_email, recipientProfileId: registration.customer_id, relatedRegistrationId: registration.id, templateKey: "event_reminder", variables: { eventTitle: event.title, eventDate: formatEventDate(event.starts_at), eventVenue: event.venue ?? "a confirmar" }, subject: `Amanhã: ${event.title}`, html: `<h1>Seu evento está chegando.</h1><p><strong>${event.title}</strong> acontece em ${formatEventDate(event.starts_at)}.</p><p>Local: <strong>${event.venue ?? "a confirmar"}</strong>.</p>` }); if (result.queued) queued += 1; } }
  const { data: expiredReservations, error: reservationError } = await supabase.rpc("expire_inventory_reservations");
  if (reservationError) return NextResponse.json({ error: "Não foi possível expirar reservas de estoque." }, { status: 500 });
  const processing = await processEmailOutbox(25);
  return NextResponse.json({ ok: true, queued, expiredReservations: expiredReservations ?? 0, processing });
}
