import { NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { getApiProfile } from "@/lib/api/auth";
import { getCheckoutAvailability } from "@/lib/payments/checkout-availability";
import { createAuthenticatedServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ fulfillment: z.enum(["retirada", "consumo_local"]), items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().optional(), salesBatchId: z.string().uuid().optional(), quantity: z.number().int().positive().max(20) })).min(1).max(30) });

export async function POST(request: Request) {
  const availability = getCheckoutAvailability({ acceptNewCheckouts: env.acceptNewCheckouts, processPaymentEvents: env.processPaymentEvents, mercadoPagoAccessToken: env.mercadoPagoAccessToken });
  if (!availability.available) return NextResponse.json({ error: availability.message, code: availability.code }, { status: 503 });
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  const parsed = bodySchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: "Carrinho inválido." }, { status: 400 });
  const { supabase, accessToken, profile } = auth;
  const userSupabase = createAuthenticatedServerClient(accessToken);
  let orderId: string | null = null;
  try {
    const { data: createdOrder, error: orderError } = await userSupabase.rpc("create_checkout_order", { p_fulfillment: parsed.data.fulfillment, p_items: parsed.data.items.map((item) => ({ product_id: item.productId, variant_id: item.variantId ?? null, sales_batch_id: item.salesBatchId ?? null, quantity: item.quantity })) });
    const rawOrder = createdOrder as unknown;
    const order = (Array.isArray(rawOrder) ? rawOrder[0] : null) as { order_id: string; order_number: number; total_cents: number } | null;
    if (orderError || !order) return NextResponse.json({ error: "Não foi possível reservar o estoque para este pedido. Atualize o carrinho e tente novamente." }, { status: 409 });
    orderId = order.order_id;
    const { data: rawOrderItems, error: itemsError } = await supabase.from("order_items").select("id,product_id,product_name,variant_name,unit_price_cents,quantity").eq("order_id", order.order_id);
    const orderItems = rawOrderItems as unknown as Array<{ id: string; product_id: string | null; product_name: string; variant_name: string | null; unit_price_cents: number; quantity: number }> | null;
    if (itemsError || !orderItems?.length) throw new Error("Não foi possível preparar os itens do pagamento.");
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ items: orderItems.map((item) => ({ id: item.id, title: [item.product_name, item.variant_name].filter(Boolean).join(" — "), quantity: item.quantity, currency_id: "BRL", unit_price: item.unit_price_cents / 100 })), external_reference: order.order_id, notification_url: `${env.appUrl}/api/payments/mercado-pago/webhook`, back_urls: { success: `${env.appUrl}/conta/pedidos?pagamento=sucesso`, pending: `${env.appUrl}/conta/pedidos?pagamento=pendente`, failure: `${env.appUrl}/loja?pagamento=falhou` }, auto_return: "approved", payer: { email: profile.email ?? undefined }, metadata: { order_id: order.order_id, order_number: order.order_number, total_cents: order.total_cents } }) });
    const preference = await preferenceResponse.json() as { id?: string; init_point?: string; message?: string }; if (!preferenceResponse.ok || !preference.id || !preference.init_point) throw new Error(preference.message ?? "Não foi possível criar a preferência de pagamento.");
    await supabase.from("orders").update({ mercado_pago_preference_id: preference.id }).eq("id", order.order_id);
    return NextResponse.json({ checkoutUrl: preference.init_point, orderId: order.order_id });
  } catch (error) {
    if (orderId) {
      await userSupabase.rpc("cancel_checkout_order", { p_order_id: orderId, p_note: "Falha ao iniciar o Checkout Mercado Pago" });
    }
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente em instantes." }, { status: 502 });
  }
}
