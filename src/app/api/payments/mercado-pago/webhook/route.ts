import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { isMercadoPagoAmountMatching, verifyMercadoPagoWebhook } from "@/lib/payments/mercado-pago";
import { createServiceClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail } from "@/lib/email/transactional";

export async function POST(request: Request) {
  const url = new URL(request.url); const payload = await request.json().catch(() => ({})); const paymentId = String(payload?.data?.id ?? url.searchParams.get("data.id") ?? "");
  if (!env.mercadoPagoAccessToken || !env.mercadoPagoWebhookSecret) return NextResponse.json({ error: "Webhook não configurado." }, { status: 503 });
  const valid = verifyMercadoPagoWebhook({ signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId: paymentId, secret: env.mercadoPagoWebhookSecret });
  if (!valid) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}` } }); if (!response.ok) return NextResponse.json({ error: "Pagamento não localizado." }, { status: 404 });
  const payment = await response.json() as { id: number; status: string; external_reference?: string; transaction_amount?: number }; const orderId = payment.external_reference; if (!orderId) return NextResponse.json({ ok: true, ignored: "without_order" });
  const supabase = createServiceClient(); const { data: order } = await supabase.from("orders").select("id,order_number,status,customer_id,customer_email,total_cents").eq("id", orderId).single(); if (!order) return NextResponse.json({ ok: true, ignored: "unknown_order" });
  if (!isMercadoPagoAmountMatching(payment.transaction_amount, order.total_cents)) return NextResponse.json({ error: "Valor do pagamento não corresponde ao pedido." }, { status: 409 });
  const paymentStatus = payment.status === "approved" ? "aprovado" : payment.status === "rejected" ? "recusado" : payment.status === "cancelled" ? "cancelado" : "pendente"; const orderStatus = paymentStatus === "aprovado" ? "pago" : paymentStatus === "cancelado" ? "cancelado" : order.status;
  await supabase.from("payments").upsert({ order_id: order.id, method: "mercado_pago_checkout", status: paymentStatus, provider_reference: String(payment.id), amount_cents: Math.round((payment.transaction_amount ?? 0) * 100), provider_payload: payment, approved_at: paymentStatus === "aprovado" ? new Date().toISOString() : null }, { onConflict: "provider_reference" });
  if (order.status !== orderStatus) { await supabase.from("orders").update({ status: orderStatus, paid_at: orderStatus === "pago" ? new Date().toISOString() : null }).eq("id", order.id); await supabase.from("order_status_history").insert({ order_id: order.id, status: orderStatus, note: `Atualização recebida pelo Mercado Pago: ${payment.status}` }); await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: orderStatus }); }
  return NextResponse.json({ ok: true });
}
