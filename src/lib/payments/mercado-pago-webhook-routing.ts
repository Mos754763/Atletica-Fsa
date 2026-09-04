/**
 * Checkout Pro has one financial source of truth: payment.  merchant_order is
 * retained solely to leave an authenticated audit trail for dashboards that
 * select it accidentally; every other Mercado Pago product is deliberately
 * outside this endpoint's processing boundary.
 */
export type MercadoPagoWebhookTopic = "payment" | "merchant_order" | "unsupported";

type ResolveMercadoPagoWebhookTopicInput = {
  payload: { type?: unknown; topic?: unknown; action?: unknown } | null | undefined;
  queryType?: string | null;
};

export function resolveMercadoPagoWebhookTopic({ payload, queryType }: ResolveMercadoPagoWebhookTopicInput): MercadoPagoWebhookTopic {
  const candidate = [payload?.type, payload?.topic, queryType]
    .find((value): value is string => typeof value === "string" && value.trim().length > 0)
    ?.trim()
    .toLowerCase();

  if (candidate === "payment") return "payment";
  if (candidate === "merchant_order") return "merchant_order";
  return "unsupported";
}
