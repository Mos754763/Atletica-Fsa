import { NextResponse } from "next/server";
import { getApiProfile } from "@/lib/api/auth";
import { canMoveOrderStatus } from "@/lib/orders/workflow";
import { sendOrderStatusEmail } from "@/lib/email/transactional";
import type { OrderState } from "@/types/domain";

const visibleStates: OrderState[] = ["pago", "em_preparo", "pronto"];

export async function GET(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!["admin", "cozinha"].includes(auth.profile.role)) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const { data, error } = await auth.supabase.from("orders").select("id,order_number,status,fulfillment,customer_name,notes,created_at,order_items(product_name,quantity)").in("status", visibleStates).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Não foi possível carregar a fila." }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!["admin", "cozinha"].includes(auth.profile.role)) return NextResponse.json({ error: "Acesso restrito à operação." }, { status: 403 });
  const body = await request.json().catch(() => null) as { orderId?: string; status?: OrderState } | null; if (!body?.orderId || !body.status) return NextResponse.json({ error: "Atualização inválida." }, { status: 400 });
  const { data: order } = await auth.supabase.from("orders").select("id,order_number,status,customer_id,customer_email").eq("id", body.orderId).single();
  if (!order || !canMoveOrderStatus(order.status as OrderState, body.status)) return NextResponse.json({ error: "Transição de pedido inválida." }, { status: 409 });
  const { data: updatedOrder, error } = await auth.supabase.from("orders").update({ status: body.status, ready_at: body.status === "pronto" ? new Date().toISOString() : null }).eq("id", order.id).eq("status", order.status).select("id").maybeSingle(); if (error) return NextResponse.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
  if (!updatedOrder) return NextResponse.json({ error: "O pedido foi atualizado por outra operação. Atualize a fila e tente novamente." }, { status: 409 });
  await auth.supabase.from("order_status_history").insert({ order_id: order.id, status: body.status, changed_by: auth.profile.id, note: "Atualização operacional pelo ODS" });
  await sendOrderStatusEmail({ to: order.customer_email, profileId: order.customer_id, orderId: order.id, orderNumber: order.order_number, status: body.status });
  return NextResponse.json({ ok: true });
}
