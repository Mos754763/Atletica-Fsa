import { Resend } from "resend";
import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import type { OrderState } from "@/types/domain";

type Delivery = { to: string; templateKey: string; subject: string; html: string; variables?: Record<string, string>; dedupeKey?: string; priority?: number; relatedOrderId?: string; relatedRegistrationId?: string; recipientProfileId?: string };
type QueueResult = { sent: false; queued: boolean; reason?: "not_configured" | "duplicate" };

function emailFrame(title: string, content: string) {
  return `<main style="margin:0;padding:32px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#061c48"><section style="max-width:560px;margin:auto;background:#ffffff"><header style="padding:24px 28px;background:#0B3D91;color:#ffffff;font-weight:900;letter-spacing:1px">ATLETICA <span style="padding:4px 6px;background:#FFD23F;color:#061c48">FSA</span></header><div style="padding:30px 28px"><p style="margin:0 0 10px;color:#0B3D91;font-size:12px;font-weight:800;letter-spacing:1px">UMA SÓ TORCIDA</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.1">${title}</h1>${content}<p style="margin:28px 0 0;color:#667085;font-size:12px;line-height:1.5">Esta é uma mensagem automática da ATLETICA FSA.</p></div></section></main>`;
}

function renderTemplate(source: string, variables: Record<string, string>) {
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_token, key: string) => variables[key] ?? "");
}

export async function sendTransactionalEmail(delivery: Delivery) {
  if (!env.resendApiKey || !delivery.to) return { sent: false, queued: false, reason: "not_configured" as const };
  const supabase = createServiceClient();
  const relatedKey = delivery.relatedOrderId ?? delivery.relatedRegistrationId ?? "general";
  const dedupeKey = delivery.dedupeKey ?? `${delivery.templateKey}:${delivery.to.toLowerCase()}:${relatedKey}`;
  try {
    const { data: template } = await supabase.from("email_templates").select("subject_template,html_template").eq("template_key", delivery.templateKey).is("deleted_at", null).maybeSingle();
    const variables = delivery.variables ?? {};
    const subject = template ? renderTemplate(template.subject_template, variables) : delivery.subject;
    const html = template ? emailFrame(subject, renderTemplate(template.html_template, variables)) : delivery.html;
    const { error } = await supabase.from("email_outbox").insert({ dedupe_key: dedupeKey, recipient_email: delivery.to, recipient_profile_id: delivery.recipientProfileId ?? null, template_key: delivery.templateKey, subject, html, priority: delivery.priority ?? (delivery.templateKey.startsWith("order_") ? 90 : 50), related_order_id: delivery.relatedOrderId ?? null, related_registration_id: delivery.relatedRegistrationId ?? null });
    if (error?.code === "23505") return { sent: false, queued: false, reason: "duplicate" as const } satisfies QueueResult;
    if (error) throw new Error(error.message);
    return { sent: false, queued: true } satisfies QueueResult;
  } catch (error) { console.error("[email] queue failed", error); return { sent: false, queued: false } satisfies QueueResult; }
}

export async function processEmailOutbox(limit = 25) {
  if (!env.resendApiKey) return { processed: 0, sent: 0, failed: 0, skipped: "not_configured" as const };
  const supabase = createServiceClient();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_email_outbox", { p_limit: limit });
  if (claimError) throw new Error(`Não foi possível obter a fila de e-mails: ${claimError.message}`);

  const resend = new Resend(env.resendApiKey);
  let sent = 0; let failed = 0;
  for (const email of claimed ?? []) {
    try {
      const { data, error } = await resend.emails.send({ from: env.emailFrom, to: email.recipient_email, subject: email.subject, html: email.html });
      if (error) throw new Error(error.message);
      await supabase.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: data?.id ?? null, locked_at: null, last_error: null }).eq("id", email.id).eq("status", "processing");
      await supabase.from("email_deliveries").insert({ recipient_email: email.recipient_email, recipient_profile_id: email.recipient_profile_id, template_key: email.template_key, related_order_id: email.related_order_id, related_registration_id: email.related_registration_id, provider_message_id: data?.id ?? null, sent_at: new Date().toISOString() });
      sent += 1;
    } catch (error) {
      const attempts = Number(email.attempts ?? 1);
      const terminal = attempts >= 5;
      const minutes = Math.min(60, 2 ** Math.min(attempts, 6));
      await supabase.from("email_outbox").update({ status: terminal ? "failed" : "pending", locked_at: null, last_error: error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida no provedor.", next_attempt_at: new Date(Date.now() + minutes * 60_000).toISOString() }).eq("id", email.id).eq("status", "processing");
      failed += 1;
    }
  }
  await supabase.rpc("expire_stale_email_outbox");
  return { processed: (claimed ?? []).length, sent, failed };
}

export async function sendOrderStatusEmail(input: { to: string | null; profileId?: string | null; orderId: string; orderNumber: number; status: OrderState }) {
  if (!input.to) return;
  const label = ORDER_STATUS_LABEL[input.status];
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedOrderId: input.orderId, templateKey: "order_status", dedupeKey: `order:${input.orderId}:${input.status}`, priority: 90, variables: { orderNumber: String(input.orderNumber), statusLabel: label }, subject: `Pedido #${input.orderNumber}: ${label}`, html: emailFrame(label, `<p>Seu pedido <strong>#${input.orderNumber}</strong> agora está com o status: <strong>${label}</strong>.</p><p>Acompanhe as atualizações pela sua conta FSA.</p>`) });
  const { runAutomationRules } = await import("@/lib/automation/rules");
  await runAutomationRules({ triggerKey: "order.status_changed", dedupeKey: `order:${input.orderId}:${input.status}`, context: { orderId: input.orderId, orderNumber: String(input.orderNumber), status: input.status, statusLabel: label, recipientEmail: input.to } });
}

export async function sendRegistrationEmail(input: { to: string | null; profileId?: string | null; registrationId: string; eventTitle: string; checkInCode: string; pendingPayment: boolean }) {
  if (!input.to) return;
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedRegistrationId: input.registrationId, templateKey: input.pendingPayment ? "event_registration_pending" : "event_registration_confirmed", subject: `${input.pendingPayment ? "Inscrição iniciada" : "Inscrição confirmada"}: ${input.eventTitle}`, html: emailFrame(input.pendingPayment ? "Sua inscrição foi iniciada." : "Sua vaga está confirmada.", `<p><strong>${input.eventTitle}</strong> está na sua agenda FSA.</p><p>Seu código de check-in é <strong style="font-size:18px">${input.checkInCode}</strong>.</p>${input.pendingPayment ? "<p>O pagamento será liberado em breve para concluir a inscrição.</p>" : ""}`) });
}
