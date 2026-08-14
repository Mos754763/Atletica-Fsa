import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { fetchMercadoPagoPayment, getMercadoPagoWebhookTimestamp, isMercadoPagoAmountMatching, isMercadoPagoWebhookFresh, MercadoPagoApiError, verifyMercadoPagoWebhook } from "./mercado-pago";

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

  it("rejeita cabeçalhos incompletos antes de processar o evento", () => {
    expect(verifyMercadoPagoWebhook({ signature: `v1=${hash}`, requestId, dataId: paymentId, secret })).toBe(false);
    expect(verifyMercadoPagoWebhook({ signature: `ts=${timestamp},v1=${hash}`, requestId: null, dataId: paymentId, secret })).toBe(false);
  });

  it("rejeita assinatura expirada ou excessivamente futura para reduzir replay", () => {
    const now = 1_718_824_800_000;
    const freshSignature = "ts=1718824800,v1=irrelevante";
    expect(getMercadoPagoWebhookTimestamp(freshSignature)).toBe(now);
    expect(isMercadoPagoWebhookFresh(freshSignature, now)).toBe(true);
    expect(isMercadoPagoWebhookFresh("ts=1718824499,v1=irrelevante", now)).toBe(false);
    expect(isMercadoPagoWebhookFresh("ts=1718824861,v1=irrelevante", now)).toBe(false);
    expect(isMercadoPagoWebhookFresh("ts=invalid,v1=irrelevante", now)).toBe(false);
  });

  it("confere o valor do pagamento em centavos, sem tolerar arredondamento indevido", () => {
    expect(isMercadoPagoAmountMatching(69.9, 6990)).toBe(true);
    expect(isMercadoPagoAmountMatching(69.89, 6990)).toBe(false);
    expect(isMercadoPagoAmountMatching(undefined, 6990)).toBe(false);
    expect(isMercadoPagoAmountMatching(10, -1000)).toBe(false);
  });
});

describe("fetchMercadoPagoPayment", () => {
  it("repete falha transitória e retorna a resposta posterior", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response("temporarily unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 123 }), { status: 200 }));
    const wait = vi.fn().mockResolvedValue(undefined);

    const response = await fetchMercadoPagoPayment("123", "private-token", { fetchImpl: fetchImpl as typeof fetch, wait, maxAttempts: 3 });

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledTimes(1);
  });

  it("não repete erro definitivo do provedor", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(fetchMercadoPagoPayment("missing", "private-token", { fetchImpl: fetchImpl as typeof fetch })).rejects.toMatchObject({ status: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
