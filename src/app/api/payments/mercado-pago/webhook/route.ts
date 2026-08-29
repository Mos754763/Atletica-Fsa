import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { fetchMercadoPagoPayment, getMercadoPagoWebhookTimestamp, isMercadoPagoAmountMatching, isMercadoPagoWebhookFresh, MercadoPagoApiError, verifyMercadoPagoWebhook } from "@/lib/payments/mercado-pago";
import { getPaymentEventAvailability } from "@/lib/payments/payment-event-availability";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail, sendRegistrationEmail } from "@/lib/email/transactional";
import { canMoveOrderStatus } from "@/lib/orders/workflow";
import { getMercadoPagoSignatureDataId, isMercadoPagoPointTopic, resolveMercadoPagoWebhookTopic } from "@/lib/payments/mercado-pago-webhook-routing";
import { runPostSettlementEffect } from "@/lib/payments/post-settlement-effects";

export async function POST(request: Request) {
  const url = new URL(request.url); const payload = await request.json().catch(() => ({})); const notificationId = String(payload?.data?.id ?? url.searchParams.get("data.id") ?? "");
  const topic = resolveMercadoPagoWebhookTopic({ payload, queryType: url.searchParams.get("type") });
  if (topic === "unsupported") return NextResponse.json({ ok: true, ignored: "unsupported_topic" });
  const signature = request.headers.get("x-signature"); const requestId = request.headers.get("x-request-id"); const signatureTimestamp = getMercadoPagoWebhookTimestamp(signature);
  const availability = getPaymentEventAvailability({
    processPaymentEvents: env.processPaymentEvents,
    mercadoPagoAccessToken: env.mercadoPagoAccessToken,
    mercadoPagoWebhookSecret: env.mercadoPagoWebhookSecret,
  });
  if (!availability.available) {
    return NextResponse.json({ error: availability.message, code: availability.code }, { status: 503 });
  }
  if (isMercadoPagoPointTopic(topic)) {
    return NextResponse.json({ error: "A integração Mercado Pago Point ainda não foi homologada para esta operação.", code: "point_not_implemented" }, { status: 503 });
  }
  const signatureDataId = getMercadoPagoSignatureDataId(topic, notificationId);
  const valid = verifyMercadoPagoWebhook({ signature, requestId, dataId: signatureDataId, secret: env.mercadoPagoWebhookSecret });
  if (!valid || !isMercadoPagoWebhookFresh(signature) || signatureTimestamp === null) return NextResponse.json({ error: "Assinatura inválida ou expirada." }, { status: 401 });
  const supabase = createServiceClient();
  const eventKey = `${topic}:${notificationId}:${signatureTimestamp}`;
  const { data: claimRows, error: claimError } = await supabase.rpc("claim_payment_webhook_event", { p_provider: "mercado_pago", p_event_key: eventKey, p_payment_reference: notificationId, p_request_id: requestId ?? "", p_signature_timestamp: Math.floor(signatureTimestamp / 1000), p_payload: payload });
  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  if (claimError || !claim?.event_id) return NextResponse.json({ error: "Não foi possível registrar o evento de pagamento para processamento." }, { status: 503 });
  if (!claim.claimed) return NextResponse.json({ ok: true, duplicate: true });
  const finishEvent = async (status: "succeeded" | "ignored" | "rejected" | "failed", errorCode?: string) => {
    await supabase.from("payment_webhook_events").update({ status, error_code: errorCode ?? null, processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", claim.event_id);
  };

  if (topic === "merchant_order") {
    await finishEvent("ignored", "merchant_order_not_enabled");
    return NextResponse.json({ ok: true, ignored: "merchant_order_not_enabled" });
  }

  let payment: { id: number; status: string; external_reference?: string; transaction_amount?: number };
  try {
    const response = await fetchMercadoPagoPayment(notificationId, env.mercadoPagoAccessToken!);
    payment = await response.json() as typeof payment;
  } catch (error) {
    const status = error instanceof MercadoPagoApiError && error.status === 404 ? 404 : 503;
    await finishEvent(status === 404 ? "rejected" : "failed", error instanceof MercadoPagoApiError ? `provider_http_${error.status ?? "network"}` : "provider_network_error");
    return NextResponse.json({ error: status === 404 ? "Pagamento não localizado." : "Mercado Pago temporariamente indisponível." }, { status });
  }
  const externalReference = payment.external_reference; if (!externalReference) { await finishEvent("ignored", "without_reference"); return NextResponse.json({ ok: true, ignored: "without_reference" }); }
  const paymentStatus = payment.status === "approved" ? "aprovado" : payment.status === "rejected" ? "recusado" : payment.status === "cancelled" ? "cancelado" : "pendente";
  if (externalReference.startsWith("event:")) {
    const registrationId = externalReference.slice("event:".length);
    const { data: registration } = await supabase.from("event_registrations").select("id,status,amount_cents,customer_id,attendee_email,check_in_code,events(title)").eq("id", registrationId).single();
    if (!registration) { await finishEvent("ignored", "unknown_registration"); return NextResponse.json({ ok: true, ignored: "unknown_registration" }); }
    if (!isMercadoPagoAmountMatching(payment.transaction_amount, registration.amount_cents)) { await finishEvent("rejected", "amount_mismatch"); return NextResponse.json({ error: "Valor do pagamento não corresponde ao ingresso." }, { status: 409 }); }
    if (paymentStatus !== "aprovado") {
      await supabase.from("payments").upsert({ registration_id: registration.id, method: "mercado_pago_checkout", status: paymentStatus, provider_reference: String(payment.id), amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), provider_payload: payment }, { onConflict: "provider_reference" });
      await finishEvent("succeeded"); return NextResponse.json({ ok: true, status: paymentStatus });
    }
    const { data: settledRows, error: settlementError } = await supabase.rpc("settle_paid_event_ticket", { p_registration_id: registration.id, p_provider_reference: String(payment.id), p_amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), p_provider_payload: payment });
    if (settlementError) { await finishEvent("failed", "event_settlement_error"); return NextResponse.json({ error: "Não foi possível emitir o ingresso." }, { status: 500 }); }
    const settled = Array.isArray(settledRows) ? settledRows[0] : settledRows;
    if (settled?.transitioned) await runPostSettlementEffect("registration_notification", () => sendRegistrationEmail({ to: registration.attendee_email, profileId: registration.customer_id, registrationId: registration.id, eventTitle: (registration.events as { title?: string } | null)?.title ?? "Evento FSA", checkInCode: registration.check_in_code, pendingPayment: false }));
    await finishEvent("succeeded"); return NextResponse.json({ ok: true, status: settled?.final_status ?? registration.status });
  }
  const orderId = externalReference;
  const { data: order } = await supabase.from("orders").select("id,order_number,status,customer_id,customer_email,total_cents").eq("id", orderId).single(); if (!order) { await finishEvent("ignored", "unknown_order"); return NextResponse.json({ ok: true, ignored: "unknown_order" }); }
  if (!isMercadoPagoAmountMatching(payment.transaction_amount, order.total_cents)) { await finishEvent("rejected", "amount_mismatch"); return NextResponse.json({ error: "Valor do pagamento não corresponde ao pedido." }, { status: 409 }); }
  const orderStatus = paymentStatus === "aprovado" ? "pago" : paymentStatus === "cancelado" ? "cancelado" : order.status;
  await supabase.from("payments").upsert({ order_id: order.id, method: "mercado_pago_checkout", status: paymentStatus, provider_reference: String(payment.id), amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), provider_payload: payment, approved_at: paymentStatus === "aprovado" ? new Date().toISOString() : null }, { onConflict: "provider_reference" });
  if (paymentStatus === "aprovado") {
    const { data: settlementRows, error: settlementError } = await supabase.rpc("settle_paid_order_inventory", { p_order_id: order.id });
    if (settlementError) {
      console.error("[mercado-pago] não foi possível liquidar estoque", { orderId: order.id, code: settlementError.code });
      await finishEvent("failed", "inventory_settlement_error"); return NextResponse.json({ error: "Não foi possível liquidar o pedido." }, { status: 500 });
    }
    const settlement = Array.isArray(settlementRows) ? settlementRows[0] : settlementRows;
    if (!settlement) { await finishEvent("failed", "missing_settlement_result"); return NextResponse.json({ error: "Liquidação do pedido não retornou resultado." }, { status: 500 }); }
    if (settlement.transitioned && settlement.final_status === "pago") {
      await runPostSettlementEffect("order_status_notification", () => sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: "pago" }));
    }
    await finishEvent("succeeded", settlement.failure_reason ?? undefined); return NextResponse.json({ ok: true, status: settlement.final_status, requiresManualRefund: settlement.failure_reason === "stock_unavailable" || settlement.failure_reason === "missing_product_reference" });
  }
  if (order.status !== orderStatus && canMoveOrderStatus(order.status, orderStatus)) {
    const { data: transitioned } = await supabase.from("orders")
      .update({ status: orderStatus, paid_at: orderStatus === "pago" ? new Date().toISOString() : null })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();
    if (transitioned) {
      await supabase.from("order_status_history").insert({ order_id: order.id, status: orderStatus, note: `Atualização recebida pelo Mercado Pago: ${payment.status}` });
      await runPostSettlementEffect("order_status_notification", () => sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: orderStatus }));
    }
  }
  await finishEvent("succeeded"); return NextResponse.json({ ok: true });
}
