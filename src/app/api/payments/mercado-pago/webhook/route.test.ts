import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    supabaseUrl: "https://gfnbdjdqumewspvfxicl.supabase.co",
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
import { GET, POST } from "./route";

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
    env.supabaseUrl = "https://gfnbdjdqumewspvfxicl.supabase.co";
    env.mercadoPagoAccessToken = "test-access-token";
    env.mercadoPagoWebhookSecret = "test-webhook-secret";
    mocks.getMercadoPagoWebhookTimestamp.mockReturnValue(Date.now());
    mocks.isMercadoPagoWebhookFresh.mockReturnValue(true);
    mocks.verifyMercadoPagoWebhook.mockReturnValue(true);
  });

  it.each([
    "order",
    "orders",
    "point_integration",
    "shipment",
    "shipments",
    "shipping",
    "envios",
    "subscription_preapproval",
  ])("reconhece %s como irrelevante sem consultar configuração, banco ou provedor", async (type) => {
    env.processPaymentEvents = false;
    env.mercadoPagoAccessToken = undefined;
    env.mercadoPagoWebhookSecret = undefined;
    const response = await POST(webhookRequest({ type, data: { id: "not-a-payment" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: "unsupported_topic" });
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
    expect(mocks.verifyMercadoPagoWebhook).not.toHaveBeenCalled();
  });

  it("audita merchant_order assinado sem buscar ou liquidar pagamento", async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const rpc = vi.fn().mockResolvedValue({ data: { event_id: "merchant-event-1", claimed: true }, error: null });
    mocks.createServiceClient.mockReturnValue({ rpc, from: vi.fn(() => ({ update })) });

    const response = await POST(webhookRequest({ type: "merchant_order", data: { id: "merchant-123" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: "merchant_order_not_enabled" });
    expect(rpc).toHaveBeenCalledWith("claim_payment_webhook_event", expect.objectContaining({ p_payment_reference: "merchant-123" }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "ignored", error_code: "merchant_order_not_enabled" }));
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it("rejeita merchant_order sem assinatura antes de criar auditoria", async () => {
    mocks.verifyMercadoPagoWebhook.mockReturnValueOnce(false);

    const response = await POST(webhookRequest({ type: "merchant_order", data: { id: "merchant-123" } }));

    expect(response.status).toBe(401);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it("audita merchant_order mesmo no drain, sem token ou gate financeiro", async () => {
    const update = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    const rpc = vi.fn().mockResolvedValue({ data: { event_id: "merchant-event-2", claimed: true }, error: null });
    mocks.createServiceClient.mockReturnValue({ rpc, from: vi.fn(() => ({ update })) });
    env.processPaymentEvents = false;
    env.mercadoPagoAccessToken = undefined;

    const response = await POST(webhookRequest({ type: "merchant_order", data: { id: "merchant-456" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: "merchant_order_not_enabled" });
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
  });

  it.each([
    ["payment events disabled", { processPaymentEvents: false }],
    ["missing provider token", { mercadoPagoAccessToken: undefined }],
    ["missing webhook secret", { mercadoPagoWebhookSecret: undefined }],
  ])("returns 503 for a financial payment with %s", async (_reason, overrides) => {
    Object.assign(env, overrides);

    const response = await POST(webhookRequest({ type: "payment", data: { id: "123" } }));

    expect(response.status).toBe(503);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.fetchMercadoPagoPayment).not.toHaveBeenCalled();
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

describe("GET /api/payments/mercado-pago/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "preview");
    env.supabaseUrl = "https://gfnbdjdqumewspvfxicl.supabase.co";
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("mantém o GET comum indisponível", async () => {
    const response = await GET(new Request("http://localhost/api/payments/mercado-pago/webhook"));

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("POST");
  });

  it("atesta somente Preview ligado ao projeto HML esperado", async () => {
    const response = await GET(new Request("http://localhost/api/payments/mercado-pago/webhook?attest=hml-settlement"));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      ok: true,
      vercelEnvironment: "preview",
      supabaseProjectRef: "gfnbdjdqumewspvfxicl",
    });
  });

  it("rejeita Production antes de qualquer ensaio financeiro", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    const response = await GET(new Request("http://localhost/api/payments/mercado-pago/webhook?attest=hml-settlement"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_preview" });
  });

  it("rejeita Preview ligado a outro projeto Supabase", async () => {
    env.supabaseUrl = "https://tbxihkzuyzszrfxqmleq.supabase.co";

    const response = await GET(new Request("http://localhost/api/payments/mercado-pago/webhook?attest=hml-settlement"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "not_hml" });
  });
});
