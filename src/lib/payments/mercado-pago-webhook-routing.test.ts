import { describe, expect, it } from "vitest";
import { getMercadoPagoSignatureDataId, isMercadoPagoPointTopic, resolveMercadoPagoWebhookTopic } from "./mercado-pago-webhook-routing";

describe("resolveMercadoPagoWebhookTopic", () => {
  it("reconhece pagamentos Checkout Pro e pedidos comerciais", () => {
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "payment" } })).toBe("payment");
    expect(resolveMercadoPagoWebhookTopic({ payload: { topic: "merchant_order" } })).toBe("merchant_order");
  });

  it("normaliza as duas grafias de Order (Mercado Pago)", () => {
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "order" } })).toBe("order");
    expect(resolveMercadoPagoWebhookTopic({ payload: {}, queryType: "orders" })).toBe("order");
    expect(isMercadoPagoPointTopic("order")).toBe(true);
  });

  it("classifica integrações Point legadas e tópicos desconhecidos sem processá-los como pagamento", () => {
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "point_integration" } })).toBe("point_integration");
    expect(isMercadoPagoPointTopic("point_integration")).toBe(true);
    expect(resolveMercadoPagoWebhookTopic({ payload: { type: "subscription_preapproval" } })).toBe("unsupported");
  });

  it("usa o identificador em minúsculas na assinatura de Order, conforme o contrato do Point", () => {
    expect(getMercadoPagoSignatureDataId("order", "ORD01JQ4S4KY8HWQ6NA5PXB65B3D3")).toBe("ord01jq4s4ky8hwq6na5pxb65b3d3");
    expect(getMercadoPagoSignatureDataId("payment", "123456")).toBe("123456");
  });
});
