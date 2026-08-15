export type MercadoPagoWebhookTopic = "payment" | "merchant_order" | "order" | "point_integration" | "unsupported";

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
  if (candidate === "order" || candidate === "orders") return "order";
  if (candidate === "point_integration") return "point_integration";
  return "unsupported";
}

export function getMercadoPagoSignatureDataId(topic: MercadoPagoWebhookTopic, dataId: string) {
  return topic === "order" ? dataId.toLowerCase() : dataId;
}

export function isMercadoPagoPointTopic(topic: MercadoPagoWebhookTopic) {
  return topic === "order" || topic === "point_integration";
}
