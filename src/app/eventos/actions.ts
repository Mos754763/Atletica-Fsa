"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { sendRegistrationEmail } from "@/lib/email/transactional";

export async function registerForEvent(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) redirect("/eventos");
  const supabase = await createServerAuthClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect(`/login?next=/eventos`);

  const { data: profile } = await supabase.from("profiles").select("display_name,email").eq("id", userId).single();
  const { data: event } = await supabase.from("events").select("title,status,requires_registration,registration_price_cents,capacity").eq("id", eventId).single();
  if (!event || event.status !== "inscricoes_abertas" || !event.requires_registration) redirect("/eventos?inscricao=indisponivel");
  const { count } = await supabase.from("event_registrations").select("id", { count: "exact", head: true }).eq("event_id", eventId).in("status", ["pendente", "confirmada", "check_in_realizado"]);
  if (event.capacity && (count ?? 0) >= event.capacity) redirect("/eventos?inscricao=lotado");
  const { data: registration, error } = await supabase.from("event_registrations").insert({ event_id: eventId, customer_id: userId, attendee_name: profile?.display_name || profile?.email || "Torcida FSA", attendee_email: profile?.email || null, amount_cents: event.registration_price_cents, status: event.registration_price_cents > 0 ? "pendente" : "confirmada" }).select("id,check_in_code").single();
  if (error?.code === "23505") redirect("/conta/eventos?inscricao=existente");
  if (error) redirect("/eventos?inscricao=erro");
  await sendRegistrationEmail({ to: profile?.email ?? null, profileId: userId, registrationId: registration.id, eventTitle: event.title, checkInCode: registration.check_in_code, pendingPayment: event.registration_price_cents > 0 });
  redirect(`/conta/eventos?inscricao=${event.registration_price_cents > 0 ? "pagamento" : "confirmada"}`);
}
