import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoWebhook } from "./mercado-pago";

describe("verifyMercadoPagoWebhook", () => {
  const secret = "webhook-test-secret";
  const requestId = "request-789";
  const paymentId = "123456";
  const timestamp = "1704908010";
  const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");

  it("aceita uma assinatura HMAC válida", () => {
    expect(verifyMercadoPagoWebhook({ signature: `ts=${timestamp},v1=${hash}`, requestId, dataId: paymentId, secret })).toBe(true);
  });

  it("rejeita uma assinatura adulterada", () => {
    expect(verifyMercadoPagoWebhook({ signature: `ts=${timestamp},v1=${"a".repeat(hash.length)}`, requestId, dataId: paymentId, secret })).toBe(false);
  });
});
