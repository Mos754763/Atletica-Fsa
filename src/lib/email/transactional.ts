import { env } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/server";
import { ORDER_STATUS_LABEL } from "@/lib/orders/workflow";
import type { OrderState } from "@/types/domain";

type Delivery = { to: string; templateKey: string; subject: string; html: string; variables?: Record<string, string>; dedupeKey?: string; priority?: number; relatedOrderId?: string; relatedRegistrationId?: string; recipientProfileId?: string };
type QueueResult = { sent: false; queued: boolean; reason?: "duplicate" | "recipient_missing" };

export function escapeEmailHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[character] ?? character);
}

function sanitizeSubject(value: string) {
  return value.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").replace(/\s{2,}/g, " ").trim();
}

function emailFrame(title: string, content: string) {
  return `<main style="margin:0;padding:32px;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#061c48"><section style="max-width:560px;margin:auto;background:#ffffff"><header style="padding:24px 28px;background:#0B3D91;color:#ffffff;font-weight:900;letter-spacing:1px">ATLETICA <span style="padding:4px 6px;background:#FFD23F;color:#061c48">FSA</span></header><div style="padding:30px 28px"><p style="margin:0 0 10px;color:#0B3D91;font-size:12px;font-weight:800;letter-spacing:1px">UMA SÓ TORCIDA</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.1">${escapeEmailHtml(title)}</h1>${content}<p style="margin:28px 0 0;color:#667085;font-size:12px;line-height:1.5">Esta é uma mensagem automática da ATLETICA FSA.</p></div></section></main>`;
}

function renderTemplate(source: string, variables: Record<string, string>, context: "html" | "subject") {
  return source.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_token, key: string) => {
    const value = variables[key] ?? "";
    return context === "html" ? escapeEmailHtml(value) : sanitizeSubject(value);
  });
}

class ResendDeliveryError extends Error {
  constructor(message: string, readonly ambiguous: boolean) {
    super(message);
    this.name = "ResendDeliveryError";
  }
}

async function sendResendEmail(input: { id: string; to: string; subject: string; html: string }) {
  if (!env.resendApiKey) throw new Error("O provedor Resend não está configurado.");
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `atletica-fsa/outbox/${input.id}`,
      },
      body: JSON.stringify({ from: env.emailFrom, to: input.to, subject: input.subject, html: input.html }),
    });
  } catch {
    throw new ResendDeliveryError("Falha de transporte ao enviar ao Resend; resultado ambíguo para reconciliação manual.", true);
  }
  let raw: string;
  try {
    raw = await response.text();
  } catch {
    throw new ResendDeliveryError("A resposta do Resend não pôde ser lida; resultado ambíguo para reconciliação manual.", true);
  }
  let payload: { id?: string; message?: string } = {};
  try { payload = raw ? JSON.parse(raw) as { id?: string; message?: string } : {}; } catch { payload = {}; }
  if (!response.ok) throw new ResendDeliveryError(payload.message ?? `Resend respondeu com HTTP ${response.status}.`, response.status === 408 || response.status === 409 || response.status >= 500);
  if (!payload.id) throw new ResendDeliveryError("O Resend aceitou a requisição sem retornar o identificador da mensagem; resultado ambíguo para reconciliação manual.", true);
  return payload.id;
}

export async function sendTransactionalEmail(delivery: Delivery) {
  const recipient = delivery.to.trim();
  if (!recipient) return { sent: false, queued: false, reason: "recipient_missing" as const } satisfies QueueResult;
  const supabase = createServiceClient();
  const relatedKey = delivery.relatedOrderId ?? delivery.relatedRegistrationId ?? "general";
  const dedupeKey = delivery.dedupeKey ?? `${delivery.templateKey}:${recipient.toLowerCase()}:${relatedKey}`;
  const { data: template, error: templateError } = await supabase.from("email_templates").select("subject_template,html_template").eq("template_key", delivery.templateKey).is("deleted_at", null).maybeSingle();
  if (templateError) console.warn("[email] template indisponível; usando fallback versionado", { templateKey: delivery.templateKey, errorCode: templateError.code ?? "unknown" });
  const variables = delivery.variables ?? {};
  const subject = sanitizeSubject(template ? renderTemplate(template.subject_template, variables, "subject") : delivery.subject);
  const html = template ? emailFrame(subject, renderTemplate(template.html_template, variables, "html")) : delivery.html;
  const { error } = await supabase.from("email_outbox").insert({ dedupe_key: dedupeKey, recipient_email: recipient, recipient_profile_id: delivery.recipientProfileId ?? null, template_key: delivery.templateKey, subject, html, priority: delivery.priority ?? (delivery.templateKey.startsWith("order_") ? 90 : 50), related_order_id: delivery.relatedOrderId ?? null, related_registration_id: delivery.relatedRegistrationId ?? null });
  if (error?.code === "23505") return { sent: false, queued: false, reason: "duplicate" as const } satisfies QueueResult;
  if (error) throw new Error(`Não foi possível persistir a intenção de e-mail: ${error.message}`);
  return { sent: false, queued: true } satisfies QueueResult;
}

export async function processEmailOutbox(limit = 50) {
  if (!env.resendApiKey) return { processed: 0, sent: 0, failed: 0, deadLettered: 0, skipped: "not_configured" as const };
  const supabase = createServiceClient();
  const { data: claimed, error: claimError } = await supabase.rpc("claim_email_outbox", { p_limit: limit });
  if (claimError) throw new Error(`Não foi possível obter a fila de e-mails: ${claimError.message}`);

  let sent = 0; let failed = 0; let deadLettered = 0;
  for (const email of claimed ?? []) {
    try {
      const providerMessageId = await sendResendEmail({ id: email.id, to: email.recipient_email, subject: email.subject, html: email.html });
      const sentAt = new Date().toISOString();
      const { data: finished, error: finishError } = await supabase.rpc("finish_email_outbox_delivery", { p_outbox_id: email.id, p_provider_message_id: providerMessageId, p_sent_at: sentAt });
      if (finishError) throw new Error(`Não foi possível finalizar a entrega: ${finishError.message}`);
      if (finished !== true) throw new Error("A mensagem não estava mais reivindicada ao finalizar a entrega.");
      sent += 1;
    } catch (error) {
      const attempts = Number(email.attempts ?? 1);
      const terminal = (error instanceof ResendDeliveryError && error.ambiguous) || attempts >= 5;
      const minutes = Math.min(60, 2 ** Math.min(attempts, 6));
      const { error: retryError } = await supabase.from("email_outbox").update({ status: terminal ? "failed" : "pending", locked_at: null, last_error: error instanceof Error ? error.message.slice(0, 1000) : "Falha desconhecida no provedor.", next_attempt_at: new Date(Date.now() + (terminal ? 0 : minutes * 60_000)).toISOString() }).eq("id", email.id).eq("status", "processing");
      if (retryError) console.error("[email] não foi possível liberar a mensagem para retry", { outboxId: email.id, errorCode: retryError.code ?? "unknown" });
      if (terminal) deadLettered += 1;
      failed += 1;
    }
  }
  const { error: expireError } = await supabase.rpc("expire_stale_email_outbox");
  if (expireError) throw new Error(`Não foi possível expirar mensagens esgotadas: ${expireError.message}`);
  return { processed: (claimed ?? []).length, sent, failed, deadLettered };
}

export async function sendOrderStatusEmail(input: { to: string | null; profileId?: string | null; orderId: string; orderNumber: number; status: OrderState }) {
  if (!input.to) return;
  const label = ORDER_STATUS_LABEL[input.status];
  const safeLabel = escapeEmailHtml(label);
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedOrderId: input.orderId, templateKey: "order_status", dedupeKey: `order:${input.orderId}:${input.status}`, priority: 90, variables: { orderNumber: String(input.orderNumber), statusLabel: label }, subject: `Pedido #${input.orderNumber}: ${label}`, html: emailFrame(label, `<p>Seu pedido <strong>#${input.orderNumber}</strong> agora está com o status: <strong>${safeLabel}</strong>.</p><p>Acompanhe as atualizações pela sua conta FSA.</p>`) });
  const { runAutomationRules } = await import("@/lib/automation/rules");
  await runAutomationRules({ triggerKey: "order.status_changed", dedupeKey: `order:${input.orderId}:${input.status}`, context: { orderId: input.orderId, orderNumber: String(input.orderNumber), status: input.status, statusLabel: label, recipientEmail: input.to } });
}

export async function sendRegistrationEmail(input: { to: string | null; profileId?: string | null; registrationId: string; eventTitle: string; checkInCode: string; pendingPayment: boolean }) {
  if (!input.to) return;
  const safeEventTitle = escapeEmailHtml(input.eventTitle);
  const safeCheckInCode = escapeEmailHtml(input.checkInCode);
  await sendTransactionalEmail({ to: input.to, recipientProfileId: input.profileId ?? undefined, relatedRegistrationId: input.registrationId, templateKey: input.pendingPayment ? "event_registration_pending" : "event_registration_confirmed", subject: `${input.pendingPayment ? "Inscrição iniciada" : "Inscrição confirmada"}: ${input.eventTitle}`, html: emailFrame(input.pendingPayment ? "Sua inscrição foi iniciada." : "Sua vaga está confirmada.", `<p><strong>${safeEventTitle}</strong> está na sua agenda FSA.</p><p>Seu código de check-in é <strong style="font-size:18px">${safeCheckInCode}</strong>.</p>${input.pendingPayment ? "<p>O pagamento será liberado em breve para concluir a inscrição.</p>" : ""}`) });
}
