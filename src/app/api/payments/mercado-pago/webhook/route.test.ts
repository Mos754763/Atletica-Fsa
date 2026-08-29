import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  fetchMercadoPagoPayment: vi.fn(),
  isMercadoPagoWebhookFresh: vi.fn(() => true),
  getMercadoPagoWebhookTimestamp: vi.fn(() => Date.now()),
  sendOrderStatusEmail: vi.fn(),
  verifyMercadoPagoWebhook: vi.fn(() => true),
}));

vi.mock("@/lib/env", () => ({
  env: {
    acceptNewCheckouts: false,
    processPaymentEvents: true,
    mercadoPagoAccessToken: "test-access-token",
    mercadoPagoWebhookSecret: "test-webhook-secret",
  },
}));

vi.mock("@/lib/payments/mercado-pago", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/payments/mercado-pago")>(),
  fetchMercadoPagoPayment: mocks.fetchMercadoPagoPayment,
  getMercadoPagoWebhookTimestamp: mocks.getMercadoPagoWebhookTimestamp,
  isMercadoPagoWebhookFresh: mocks.isMercadoPagoWebhookFresh,
  verifyMercadoPagoWebhook: mocks.verifyMercadoPagoWebhook,
}));

vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("@/lib/email/transactional", () => ({ sendOrderStatusEmail: mocks.sendOrderStatusEmail, sendRegistrationEmail: vi.fn() }));

import { env } from "@/lib/env";
import { POST } from "./route";

function webhookRequest(payload: unknown, query = "") {
  return new Request(`http://localhost/api/payments/mercado-pago/webhook${query}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("POST /api/payments/mercado-pago/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.acceptNewCheckouts = false;
    env.processPaymentEvents = true;
    env.mercadoPagoAccessToken = "test-access-token";
    env.mercadoPagoWebhookSecret = "test-webhook-secret";
    mocks.getMercadoPagoWebhookTimestamp.mockReturnValue(Date.now());
    mocks.isMercadoPagoWebhookFresh.mockReturnValue(true);
    mocks.verifyMercadoPagoWebhook.mockReturnValue(true);
  });

  it("ignora tópicos não suportados sem tratá-los como um pagamento", async () => {
    const response = await POST(webhookRequest({ type: "subscription_preapproval", data: { id: "sub_123" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: "unsupported_topic" });
  });

  it("mantém todos os eventos indisponíveis quando o gate de processamento estiver fechado", async () => {
    env.processPaymentEvents = false;
    const response = await POST(webhookRequest({ type: "order", data: { id: "ORD01TEST" } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ code: "payment_events_disabled" });
  });

  it("confirma pagamento aprovado com novos checkouts fechados, mesmo se a notificação falhar", async () => {
    const orderId = "8c3054fc-6be1-47be-86bc-654d4296d3bb";
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const rpc = vi.fn()
      .mockResolvedValueOnce({ data: { event_id: "event-1", claimed: true }, error: null })
      .mockResolvedValueOnce({ data: { transitioned: true, final_status: "pago", failure_reason: null }, error: null });
    const from = vi.fn((table: string) => {
      if (table === "payment_webhook_events") return { update };
      if (table === "payments") return { upsert };
      if (table === "orders") return { select: () => ({ eq: () => ({ single: async () => ({ data: { id: orderId, order_number: 321, status: "aguardando_pagamento", customer_id: "customer-1", customer_email: "cliente@example.com", total_cents: 1200 }, error: null }) }) }) };
      throw new Error(`Tabela inesperada no teste: ${table}`);
    });
    mocks.createServiceClient.mockReturnValue({ rpc, from });
    mocks.fetchMercadoPagoPayment.mockResolvedValue({ json: async () => ({ id: 123, status: "approved", external_reference: orderId, transaction_amount: 12 }) });
    mocks.sendOrderStatusEmail.mockRejectedValueOnce(new Error("outbox indisponível"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(webhookRequest({ type: "payment", data: { id: "123" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, status: "pago", requiresManualRefund: false });
    expect(rpc).toHaveBeenNthCalledWith(2, "settle_paid_order_inventory", { p_order_id: orderId });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "succeeded" }));
    errorSpy.mockRestore();
  });

  it("reconhece um evento já reivindicado sem consultar o provedor novamente", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { event_id: "event-1", claimed: false }, error: null });
    mocks.createServiceClient.mockReturnValue({ rpc });

    const response = await POST(webhookRequest({ type: "payment", data: { id: "123" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, duplicate: true });
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
  });
});
