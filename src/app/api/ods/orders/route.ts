import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/api/auth";
import { canMoveOrderStatus } from "@/lib/orders/workflow";
import { normalizePickupQrToken } from "@/lib/orders/pickup-token";
import { sendOrderStatusEmail } from "@/lib/email/transactional";
import { createAuthenticatedServerClient } from "@/lib/supabase/server";
import { canAccessRoles } from "@/lib/auth/roles";
import type { OrderState } from "@/types/domain";

const visibleStates: OrderState[] = ["aguardando_pagamento", "pago", "em_preparo", "pronto"];

export async function GET(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "cozinha", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const { data, error } = await auth.supabase.from("orders").select("id,order_number,status,fulfillment,customer_name,notes,created_at,order_items(product_name,quantity)").in("status", visibleStates).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Não foi possível carregar a fila." }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "cozinha", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const body = await request.json().catch(() => null) as { orderId?: string; status?: OrderState; pickupToken?: string } | null; if (!body?.orderId || !body.status) return NextResponse.json({ error: "Atualização inválida." }, { status: 400 });
  const { data: order } = await auth.supabase.from("orders").select("id,order_number,status,customer_id,customer_email,fulfillment,pickup_code").eq("id", body.orderId).single();
  if (!order || !canMoveOrderStatus(order.status as OrderState, body.status)) return NextResponse.json({ error: "Transição de pedido inválida." }, { status: 409 });
  const operationalClient = createAuthenticatedServerClient(auth.accessToken);
  if (body.status === "entregue" && order.fulfillment === "retirada") {
    const token = body.pickupToken ? normalizePickupQrToken(body.pickupToken) : null;
    if (!token) return NextResponse.json({ error: "Leia um QR Code de retirada válido." }, { status: 422 });
    const { data, error } = await operationalClient.rpc("confirm_order_pickup_by_qr", { p_order_id: order.id, p_pickup_qr_token: token });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (data?.[0]?.already_picked_up) return NextResponse.json({ error: "Este pedido já foi retirado." }, { status: 409 });
  } else if (order.status === "aguardando_pagamento" && body.status === "pago") {
    const { error } = await operationalClient.rpc("confirm_manual_order_payment", { p_order_id: order.id, p_payment_method: "pix_presencial" });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  } else {
    const { error } = await operationalClient.rpc("advance_ods_order", { p_order_id: order.id, p_next_status: body.status });
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  }
  await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: body.status });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "cozinha", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    fulfillment?: string;
    paymentMethod?: string;
    paymentStatus?: "aprovado" | "pendente";
    customerName?: string;
    notes?: string;
    items?: Array<{ productId?: string; variantId?: string | null; quantity?: number }>;
  } | null;

  if (!body || !["retirada", "consumo_local"].includes(body.fulfillment ?? "") || !["pix_presencial", "dinheiro"].includes(body.paymentMethod ?? "") || !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    return NextResponse.json({ error: "Dados do pedido manual inválidos." }, { status: 400 });
  }

  const items = body.items.map((item) => ({ product_id: item.productId, variant_id: item.variantId ?? null, quantity: item.quantity }));
  const operationalClient = createAuthenticatedServerClient(auth.accessToken);
  const { data, error } = await operationalClient.rpc("create_manual_order_with_payment_state", {
    p_fulfillment: body.fulfillment,
    p_payment_method: body.paymentMethod,
    p_payment_status: body.paymentStatus ?? "aprovado",
    p_customer_name: body.customerName ?? "",
    p_items: items,
    p_notes: body.notes ?? "",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  return NextResponse.json({ order: Array.isArray(data) ? data[0] : data }, { status: 201 });
}
