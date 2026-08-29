"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { requireRole } from "@/lib/auth/require-role";
import { getCheckoutAvailability } from "@/lib/payments/checkout-availability";

const idSchema = z.string().uuid();

export async function startEventCheckout(formData: FormData) {
  const { supabase, userId, profile } = await requireRole(["admin", "backoffice", "caixa", "cliente"]);
  const registrationId = idSchema.parse(formData.get("registrationId"));
  const availability = getCheckoutAvailability({ acceptNewCheckouts: env.acceptNewCheckouts, mercadoPagoAccessToken: env.mercadoPagoAccessToken });
  if (!availability.available) redirect(`/conta/eventos?pagamento=indisponivel&registro=${registrationId}`);
  const { data: registration } = await supabase.from("event_registrations").select("id,status,amount_cents,events(title)").eq("id", registrationId).eq("customer_id", userId).single();
  if (!registration || registration.status !== "pendente" || registration.amount_cents <= 0) redirect(`/conta/eventos?pagamento=invalido&registro=${registrationId}`);
  const eventTitle = (registration.events as { title?: string } | null)?.title ?? "Evento FSA";
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ items: [{ id: registration.id, title: `Ingresso — ${eventTitle}`, quantity: 1, currency_id: "BRL", unit_price: registration.amount_cents / 100 }], external_reference: `event:${registration.id}`, notification_url: `${env.appUrl}/api/payments/mercado-pago/webhook`, back_urls: { success: `${env.appUrl}/conta/eventos?pagamento=sucesso&registro=${registration.id}`, pending: `${env.appUrl}/conta/eventos?pagamento=pendente&registro=${registration.id}`, failure: `${env.appUrl}/conta/eventos?pagamento=falhou&registro=${registration.id}` }, auto_return: "approved", payer: { email: profile.email ?? undefined }, metadata: { registration_id: registration.id, total_cents: registration.amount_cents } }) });
  const preference = await response.json() as { init_point?: string; message?: string };
  if (!response.ok || !preference.init_point) redirect(`/conta/eventos?pagamento=erro&registro=${registrationId}`);
  redirect(preference.init_point);
}

export async function transferEventTicket(formData: FormData) {
  const { supabase } = await requireRole(["admin", "backoffice", "caixa", "cliente"]);
  const ticketId = idSchema.parse(formData.get("ticketId"));
  const email = z.string().trim().email().max(254).parse(formData.get("recipientEmail"));
  const { error } = await supabase.rpc("transfer_event_ticket", { p_ticket_id: ticketId, p_recipient_email: email });
  if (error) redirect(`/conta/eventos?transferencia=erro`);
  redirect(`/conta/eventos?transferencia=sucesso`);
}
