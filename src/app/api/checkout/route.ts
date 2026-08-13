import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getApiProfile } from "@/lib/api/auth";

const bodySchema = z.object({ fulfillment: z.enum(["retirada", "consumo_local"]), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive().max(20) })).min(1).max(30) });

export async function POST(request: Request) {
  if (!env.mercadoPagoAccessToken) return NextResponse.json({ error: "Checkout Mercado Pago ainda não foi configurado pela administração." }, { status: 503 });
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  const parsed = bodySchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Carrinho inválido." }, { status: 400 });
  const { supabase, profile } = auth; const productIds = parsed.data.items.map((item) => item.productId);
  const { data: products } = await supabase.from("products").select("id,name,price_cents,stock_quantity,is_active").in("id", productIds).returns<Array<{ id: string; name: string; price_cents: number; stock_quantity: number; is_active: boolean }>>();
  if (!products || products.length !== productIds.length) return NextResponse.json({ error: "Um ou mais produtos não estão disponíveis." }, { status: 400 });
  const items = parsed.data.items.map((item) => { const product = products.find((candidate) => candidate.id === item.productId)!; if (!product.is_active || product.stock_quantity < item.quantity) throw new Error(`Estoque indisponível para ${product.name}.`); return { ...item, product }; });
  const totalCents = items.reduce((total, item) => total + item.product.price_cents * item.quantity, 0);
  try {
    const { data: order, error: orderError } = await supabase.from("orders").insert({ customer_id: profile.id, status: "aguardando_pagamento", fulfillment: parsed.data.fulfillment, customer_name: profile.display_name, customer_email: profile.email, subtotal_cents: totalCents, total_cents: totalCents }).select("id,order_number").single();
    if (orderError || !order) throw new Error("Não foi possível criar o pedido.");
    const { error: lineError } = await supabase.from("order_items").insert(items.map((item) => ({ order_id: order.id, product_id: item.product.id, product_name: item.product.name, unit_price_cents: item.product.price_cents, quantity: item.quantity, line_total_cents: item.product.price_cents * item.quantity })));
    if (lineError) throw new Error("Não foi possível registrar os itens do pedido.");
    await supabase.from("order_status_history").insert({ order_id: order.id, status: "aguardando_pagamento", changed_by: profile.id, note: "Preferência Mercado Pago criada" });
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ items: items.map((item) => ({ id: item.product.id, title: item.product.name, quantity: item.quantity, currency_id: "BRL", unit_price: item.product.price_cents / 100 })), external_reference: order.id, notification_url: `${env.appUrl}/api/payments/mercado-pago/webhook`, back_urls: { success: `${env.appUrl}/conta/pedidos?pagamento=sucesso`, pending: `${env.appUrl}/conta/pedidos?pagamento=pendente`, failure: `${env.appUrl}/loja?pagamento=falhou` }, auto_return: "approved", payer: { email: profile.email ?? undefined }, metadata: { order_id: order.id, order_number: order.order_number } }) });
    const preference = await preferenceResponse.json() as { id?: string; init_point?: string; message?: string }; if (!preferenceResponse.ok || !preference.id || !preference.init_point) throw new Error(preference.message ?? "Não foi possível criar a preferência de pagamento.");
    await supabase.from("orders").update({ mercado_pago_preference_id: preference.id }).eq("id", order.id);
    return NextResponse.json({ checkoutUrl: preference.init_point, orderId: order.id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o pagamento." }, { status: 400 }); }
}
