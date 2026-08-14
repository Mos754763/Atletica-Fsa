import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isMercadoPagoAmountMatching, verifyMercadoPagoWebhook } from "@/lib/payments/mercado-pago";
import { getCheckoutAvailability } from "@/lib/payments/checkout-availability";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail, sendRegistrationEmail } from "@/lib/email/transactional";
import { canMoveOrderStatus } from "@/lib/orders/workflow";

export async function POST(request: Request) {
  const url = new URL(request.url); const payload = await request.json().catch(() => ({})); const paymentId = String(payload?.data?.id ?? url.searchParams.get("data.id") ?? "");
  const availability = getCheckoutAvailability({ paymentsEnabled: env.paymentsEnabled, mercadoPagoAccessToken: env.mercadoPagoAccessToken });
  if (!availability.available || !env.mercadoPagoWebhookSecret) return NextResponse.json({ error: "Conciliação Mercado Pago indisponível para lançamento comercial.", code: availability.available ? "webhook_not_configured" : availability.code }, { status: 503 });
  const valid = verifyMercadoPagoWebhook({ signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: paymentId, secret: env.mercadoPagoWebhookSecret });
  if (!valid) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}` } }); if (!response.ok) return NextResponse.json({ error: "Pagamento não localizado." }, { status: 404 });
  const payment = await response.json() as { id: number; status: string; external_reference?: string; transaction_amount?: number }; const externalReference = payment.external_reference; if (!externalReference) return NextResponse.json({ ok: true, ignored: "without_reference" });
  const supabase = createServiceClient();
  const paymentStatus = payment.status === "approved" ? "aprovado" : payment.status === "rejected" ? "recusado" : payment.status === "cancelled" ? "cancelado" : "pendente";
  if (externalReference.startsWith("event:")) {
    const registrationId = externalReference.slice("event:".length);
    const { data: registration } = await supabase.from("event_registrations").select("id,status,amount_cents,customer_id,attendee_email,check_in_code,events(title)").eq("id", registrationId).single();
    if (!registration) return NextResponse.json({ ok: true, ignored: "unknown_registration" });
    if (!isMercadoPagoAmountMatching(payment.transaction_amount, registration.amount_cents)) return NextResponse.json({ error: "Valor do pagamento não corresponde ao ingresso." }, { status: 409 });
    if (paymentStatus !== "aprovado") {
      await supabase.from("payments").upsert({ registration_id: registration.id, method: "mercado_pago_checkout", status: paymentStatus, provider_reference: String(payment.id), amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), provider_payload: payment }, { onConflict: "provider_reference" });
      return NextResponse.json({ ok: true, status: paymentStatus });
    }
    const { data: settledRows, error: settlementError } = await supabase.rpc("settle_paid_event_ticket", { p_registration_id: registration.id, p_provider_reference: String(payment.id), p_amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), p_provider_payload: payment });
    if (settlementError) return NextResponse.json({ error: "Não foi possível emitir o ingresso." }, { status: 500 });
    const settled = Array.isArray(settledRows) ? settledRows[0] : settledRows;
    if (settled?.transitioned) await sendRegistrationEmail({ to: registration.attendee_email, profileId: registration.customer_id, registrationId: registration.id, eventTitle: (registration.events as { title?: string } | null)?.title ?? "Evento FSA", checkInCode: registration.check_in_code, pendingPayment: false });
    return NextResponse.json({ ok: true, status: settled?.final_status ?? registration.status });
  }
  const orderId = externalReference;
  const { data: order } = await supabase.from("orders").select("id,order_number,status,customer_id,customer_email,total_cents").eq("id", orderId).single(); if (!order) return NextResponse.json({ ok: true, ignored: "unknown_order" });
  if (!isMercadoPagoAmountMatching(payment.transaction_amount, order.total_cents)) return NextResponse.json({ error: "Valor do pagamento não corresponde ao pedido." }, { status: 409 });
  const orderStatus = paymentStatus === "aprovado" ? "pago" : paymentStatus === "cancelado" ? "cancelado" : order.status;
  await supabase.from("payments").upsert({ order_id: order.id, method: "mercado_pago_checkout", status: paymentStatus, provider_reference: String(payment.id), amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), provider_payload: payment, approved_at: paymentStatus === "aprovado" ? new Date().toISOString() : null }, { onConflict: "provider_reference" });
  if (paymentStatus === "aprovado") {
    const { data: settlementRows, error: settlementError } = await supabase.rpc("settle_paid_order_inventory", { p_order_id: order.id });
    if (settlementError) {
      console.error("[mercado-pago] não foi possível liquidar estoque", { orderId: order.id, code: settlementError.code });
      return NextResponse.json({ error: "Não foi possível liquidar o pedido." }, { status: 500 });
    }
    const settlement = Array.isArray(settlementRows) ? settlementRows[0] : settlementRows;
    if (!settlement) return NextResponse.json({ error: "Liquidação do pedido não retornou resultado." }, { status: 500 });
    if (settlement.transitioned && settlement.final_status === "pago") {
      await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: "pago" });
    }
    return NextResponse.json({ ok: true, status: settlement.final_status, requiresManualRefund: settlement.failure_reason === "stock_unavailable" || settlement.failure_reason === "missing_product_reference" });
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
      await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: orderStatus });
    }
  }
  return NextResponse.json({ ok: true });
}
