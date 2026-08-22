import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiProfile } from "@/lib/api/auth";
import { canMoveOrderStatus } from "@/lib/orders/workflow";
import { normalizePickupQrToken } from "@/lib/orders/pickup-token";
import { sendOrderStatusEmail } from "@/lib/email/transactional";
import { createAuthenticatedServerClient } from "@/lib/supabase/server";
import { canAccessRoles } from "@/lib/auth/roles";
import type { OrderState } from "@/types/domain";

const visibleStates: OrderState[] = ["aguardando_pagamento", "pago", "em_preparo", "pronto"];
const orderStateSchema = z.enum(["criado", "aguardando_pagamento", "pago", "em_preparo", "pronto", "entregue", "cancelado"]);
const patchSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStateSchema,
  pickupToken: z.string().trim().min(1).max(1024).optional(),
}).strict();
const manualOrderSchema = z.object({
  fulfillment: z.enum(["retirada", "consumo_local"]),
  paymentMethod: z.enum(["pix_presencial", "dinheiro"]),
  paymentStatus: z.enum(["aprovado", "pendente"]).optional(),
  customerName: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().positive().max(20),
  }).strict()).min(1).max(30),
}).strict();

function operationalFailure(operation: string, code: string | null | undefined, status = 409) {
  console.error("[ods] rpc-failure", { operation, code: code ?? null });
  return NextResponse.json({ error: "Não foi possível concluir esta operação agora. Atualize a fila e tente novamente." }, { status });
}

export async function GET(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "backoffice", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const { data, error } = await auth.supabase.from("orders").select("id,order_number,status,fulfillment,customer_name,notes,created_at,order_items(product_name,quantity)").in("status", visibleStates).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Não foi possível carregar a fila." }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "backoffice", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Atualização inválida." }, { status: 400 });
  const body = parsed.data;
  const { data: order } = await auth.supabase.from("orders").select("id,order_number,status,customer_id,customer_email,fulfillment,pickup_code").eq("id", body.orderId).single();
  if (!order || !canMoveOrderStatus(order.status as OrderState, body.status)) return NextResponse.json({ error: "Transição de pedido inválida." }, { status: 409 });
  const operationalClient = createAuthenticatedServerClient(auth.accessToken);
  if (body.status === "entregue" && order.fulfillment === "retirada") {
    const token = body.pickupToken ? normalizePickupQrToken(body.pickupToken) : null;
    if (!token) return NextResponse.json({ error: "Leia um QR Code de retirada válido." }, { status: 422 });
    const { data, error } = await operationalClient.rpc("confirm_order_pickup_by_qr", { p_order_id: order.id, p_pickup_qr_token: token });
    if (error) return operationalFailure("confirm_order_pickup_by_qr", error.code);
    if (data?.[0]?.already_picked_up) return NextResponse.json({ error: "Este pedido já foi retirado." }, { status: 409 });
  } else if (order.status === "aguardando_pagamento" && body.status === "pago") {
    const { error } = await operationalClient.rpc("confirm_manual_order_payment", { p_order_id: order.id, p_payment_method: "pix_presencial" });
    if (error) return operationalFailure("confirm_manual_order_payment", error.code);
  } else {
    const { error } = await operationalClient.rpc("advance_ods_order", { p_order_id: order.id, p_next_status: body.status });
    if (error) return operationalFailure("advance_ods_order", error.code);
  }
  await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: body.status });
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin", "backoffice", "caixa"])) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });

  const parsed = manualOrderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Dados do pedido manual inválidos." }, { status: 400 });
  const body = parsed.data;

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

  if (error) return operationalFailure("create_manual_order_with_payment_state", error.code, 422);
  return NextResponse.json({ order: Array.isArray(data) ? data[0] : data }, { status: 201 });
}
