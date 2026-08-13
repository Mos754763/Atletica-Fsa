import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { sendTransactionalEmail } from "@/lib/email/transactional";
import { formatEventDate } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!env.cronSecret || authorization !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const start = new Date(); start.setHours(start.getHours() + 23); const end = new Date(); end.setHours(end.getHours() + 25);
  const supabase = createServiceClient(); const { data: events } = await supabase.from("events").select("id,title,starts_at,venue").gte("starts_at", start.toISOString()).lte("starts_at", end.toISOString()).in("status", ["inscricoes_abertas", "em_andamento"]);
  let deliveries = 0;
  for (const event of events ?? []) { const { data: registrations } = await supabase.from("event_registrations").select("id,attendee_email,customer_id").eq("event_id", event.id).in("status", ["confirmada", "check_in_realizado"]); for (const registration of registrations ?? []) { if (!registration.attendee_email) continue; const result = await sendTransactionalEmail({ to: registration.attendee_email, recipientProfileId: registration.customer_id, relatedRegistrationId: registration.id, templateKey: "event_reminder", subject: `Amanhã: ${event.title}`, html: `<h1>Seu evento está chegando.</h1><p><strong>${event.title}</strong> acontece em ${formatEventDate(event.starts_at)}.</p><p>Local: <strong>${event.venue ?? "a confirmar"}</strong>.</p>` }); if (result.sent) deliveries += 1; } }
  return NextResponse.json({ ok: true, deliveries });
}
