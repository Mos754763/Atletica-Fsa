import { describe, expect, it } from "vitest";
import { resolveMercadoPagoWebhookTopic } from "./mercado-pago-webhook-routing";

describe("resolveMercadoPagoWebhookTopic", () => {
  it("reconhece pagamentos Checkout Pro e pedidos comerciais", () => {
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "payment" } })).toBe("payment");
    expect(resolveMercadoPagoWebhookTopic({ payload: { topic: "merchant_order" } })).toBe("merchant_order");
  });

  it("classifica Order, Point, Envios e tópicos desconhecidos fora da fronteira de pagamento", () => {
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "order" } })).toBe("unsupported");
    expect(resolveMercadoPagoWebhookTopic({ payload: {}, queryType: "orders" })).toBe("unsupported");
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "point_integration" } })).toBe("unsupported");
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "shipment" } })).toBe("unsupported");
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "shipping" } })).toBe("unsupported");
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "subscription_preapproval" } })).toBe("unsupported");
  });
});
