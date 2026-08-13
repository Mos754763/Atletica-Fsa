import { Resend } from "resend";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import type { OrderState } from "@/types/domain";

type Delivery = { to: string; templateKey: string; subject: string; html: string; relatedOrderId?: string; relatedRegistrationId?: string; recipientProfileId?: string };

function emailFrame(title: string, content: string) {
  return `<main style="margin:0;padding:32px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#061c48"><section style="max-width:560px;margin:auto;background:#ffffff"><header style="padding:24px 28px;background:#0B3D91;color:#ffffff;font-weight:900;letter-spacing:1px">ATLETICA <span style="padding:4px 6px;background:#FFD23F;color:#061c48">FSA</span></header><div style="padding:30px 28px"><p style="margin:0 0 10px;color:#0B3D91;font-size:12px;font-weight:800;letter-spacing:1px">UMA SÓ TORCIDA</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.1">${title}</h1>${content}<p style="margin:28px 0 0;color:#667085;font-size:12px;line-height:1.5">Esta é uma mensagem automática da ATLETICA FSA.</p></div></section></main>`;
}

export async function sendTransactionalEmail(delivery: Delivery) {
  if (!env.resendApiKey || !delivery.to) return { sent: false, reason: "not_configured" as const };
  const supabase = createServiceClient();
  const duplicate = supabase.from("email_deliveries").select("id").eq("recipient_email", delivery.to).eq("template_key", delivery.templateKey);
  if (delivery.relatedOrderId) duplicate.eq("related_order_id", delivery.relatedOrderId);
  if (delivery.relatedRegistrationId) duplicate.eq("related_registration_id", delivery.relatedRegistrationId);
  const { data: existing } = await duplicate.limit(1);
  if (existing?.length) return { sent: false, reason: "duplicate" as const };
  try {
    const resend = new Resend(env.resendApiKey);
    const { data, error } = await resend.emails.send({ from: env.emailFrom, to: delivery.to, subject: delivery.subject, html: delivery.html });
    if (error) throw new Error(error.message);
    await supabase.from("email_deliveries").insert({ recipient_email: delivery.to, recipient_profile_id: delivery.recipientProfileId ?? null, template_key: delivery.templateKey, related_order_id: delivery.relatedOrderId ?? null, related_registration_id: delivery.relatedRegistrationId ?? null, provider_message_id: data?.id ?? null, sent_at: new Date().toISOString() });
    return { sent: true as const };
  } catch (error) { console.error("[email] delivery failed", error); return { sent: false as const, reason: "provider_error" as const }; }
}

export async function sendOrderStatusEmail(input: { to: string | null; profileId?: string | null; orderId: string; orderNumber: number; status: OrderState }) {
  if (!input.to) return;
  const label = ORDER_STATUS_LABEL[input.status];
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedOrderId: input.orderId, templateKey: `order_${input.status}`, subject: `Pedido #${input.orderNumber}: ${label}`, html: emailFrame(label, `<p>Seu pedido <strong>#${input.orderNumber}</strong> agora está com o status: <strong>${label}</strong>.</p><p>Acompanhe as atualizações pela sua conta FSA.</p>`) });
}

export async function sendRegistrationEmail(input: { to: string | null; profileId?: string | null; registrationId: string; eventTitle: string; checkInCode: string; pendingPayment: boolean }) {
  if (!input.to) return;
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedRegistrationId: input.registrationId, templateKey: input.pendingPayment ? "event_registration_pending" : "event_registration_confirmed", subject: `${input.pendingPayment ? "Inscrição iniciada" : "Inscrição confirmada"}: ${input.eventTitle}`, html: emailFrame(input.pendingPayment ? "Sua inscrição foi iniciada." : "Sua vaga está confirmada.", `<p><strong>${input.eventTitle}</strong> está na sua agenda FSA.</p><p>Seu código de check-in é <strong style="font-size:18px">${input.checkInCode}</strong>.</p>${input.pendingPayment ? "<p>O pagamento será liberado em breve para concluir a inscrição.</p>" : ""}`) });
}
