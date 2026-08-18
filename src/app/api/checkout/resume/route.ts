import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiProfile } from "@/lib/api/auth";
import { env } from "@/lib/env";
import { canResumeCheckout } from "@/lib/payments/checkout-resume";
import { getCheckoutAvailability } from "@/lib/payments/checkout-availability";

const bodySchema = z.object({ orderId: z.string().uuid() });

export async function POST(request: Request) {
  const availability = getCheckoutAvailability({ paymentsEnabled: env.paymentsEnabled, mercadoPagoAccessToken: env.mercadoPagoAccessToken });
  if (!availability.available) return NextResponse.json({ error: availability.message, code: availability.code }, { status: 503 });
  const auth = await getApiProfile(request);
  if ("error" in auth) return auth.error;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });

  const { data: order, error } = await auth.supabase
    .from("orders")
    .select("id,status,payment_expires_at,mercado_pago_preference_id")
    .eq("id", parsed.data.orderId)
    .eq("customer_id", auth.profile.id)
    .maybeSingle();

  if (error || !order) return NextResponse.json({ error: "Pedido não localizado." }, { status: 404 });
  if (!canResumeCheckout({ status: order.status, paymentExpiresAt: order.payment_expires_at, preferenceId: order.mercado_pago_preference_id })) {
    return NextResponse.json({ error: "Este pedido não possui mais uma reserva de pagamento ativa." }, { status: 409 });
  }

  const response = await fetch(`https://api.mercadopago.com/checkout/preferences/${order.mercado_pago_preference_id}`, {
    headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}` },
  });
  const preference = await response.json() as { init_point?: string; message?: string };
  if (!response.ok || !preference.init_point) {
    return NextResponse.json({ error: preference.message ?? "Não foi possível retomar o pagamento. Tente criar um novo pedido." }, { status: 502 });
  }
  return NextResponse.json({ checkoutUrl: preference.init_point, orderId: order.id });
}
