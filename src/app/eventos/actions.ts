"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { sendRegistrationEmail } from "@/lib/email/transactional";

export async function registerForEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const ticketLotId = String(formData.get("ticketLotId") ?? "").trim() || null;
  if (!eventId) redirect("/eventos");
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/login?next=/eventos`);

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
  const { data: event } = await supabase.from("events").select("title,status,requires_registration").eq("id", eventId).single();
  if (!event || event.status !== "inscricoes_abertas" || !event.requires_registration) redirect("/eventos?inscricao=indisponivel");
  const { data, error } = await supabase.rpc("create_event_registration_ticket", { p_event_id: eventId, p_ticket_lot_id: ticketLotId });
  const registration = Array.isArray(data) ? data[0] : data;
  if (error?.message?.includes("já existe")) redirect("/conta/eventos?inscricao=existente");
  if (error?.message?.includes("lotado") || error?.message?.includes("Lote esgotado")) redirect("/eventos?inscricao=lotado");
  if (error || !registration) redirect("/eventos?inscricao=erro");
  await sendRegistrationEmail({ to: profile?.email ?? null, profileId: userId, registrationId: registration.registration_id, eventTitle: event.title, checkInCode: registration.check_in_code, pendingPayment: registration.payment_required });
  redirect(`/conta/eventos?inscricao=${registration.payment_required ? "pagamento" : "confirmada"}&registro=${registration.registration_id}`);
}
