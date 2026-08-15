import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    paymentsEnabled: false,
    mercadoPagoAccessToken: "test-access-token",
    mercadoPagoWebhookSecret: "test-webhook-secret",
  },
}));

import { POST } from "./route";

function webhookRequest(payload: unknown, query = "") {
  return new Request(`http://localhost/api/payments/mercado-pago/webhook${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/payments/mercado-pago/webhook", () => {
  it("ignora tópicos não suportados sem tratá-los como um pagamento", async () => {
    const response = await POST(webhookRequest({ type: "subscription_preapproval", data: { id: "sub_123" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: "unsupported_topic" });
  });

  it("mantém eventos Point indisponíveis enquanto o gate de homologação estiver fechado", async () => {
    const response = await POST(webhookRequest({ type: "order", data: { id: "ORD01TEST" } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "payments_disabled" });
  });
});
