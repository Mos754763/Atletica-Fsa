import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { PointResilienceError, PointResilienceHarness, type PointWebhookPayload } from "./point-resilience";

const secret = "point-webhook-test-secret";
const now = 1_718_824_800_000;
const timestamp = String(now / 1000);

function payload(overrides: Omit<Partial<PointWebhookPayload>, "data"> & { data?: Partial<PointWebhookPayload["data"]> } = {}): PointWebhookPayload {
  const base: PointWebhookPayload = {
    action: "order.processed",
    type: "order",
    data: {
      id: "ORD-POINT-001",
      external_reference: "fsa-pos-order-1042",
      status: "processed",
      status_detail: "accredited",
      total_paid_amount: "69.90",
      type: "point",
      version: 3,
      transactions: { payments: [{ id: "PAY-POINT-001", amount: "69.90", paid_amount: "69.90", status: "processed" }] },
    },
  };
  return { ...base, ...overrides, data: { ...base.data, ...overrides.data } };
}

function signedWebhook(webhookPayload: PointWebhookPayload, requestId = "request-point-001") {
  const manifest = `id:${webhookPayload.data.id};request-id:${requestId};ts:${timestamp};`;
  const signature = `ts=${timestamp},v1=${createHmac("sha256", secret).update(manifest).digest("hex")}`;
  return { payload: webhookPayload, signature, requestId, secret, now };
}

function preparedHarness() {
  const harness = new PointResilienceHarness();
  const reservation = harness.reserveAttempt({
    id: "attempt-001",
    orderId: "order-1042",
    terminalId: "terminal-a",
    idempotencyKey: "8a24eb9e-e163-4891-90da-5abb63060360",
    externalReference: "fsa-pos-order-1042",
    amountCents: 6990,
  });
  harness.bindProviderOrder(reservation.attempt.id, { orderId: "ORD-POINT-001", paymentId: "PAY-POINT-001", status: "at_terminal" });
  return harness;
}

function expectPointError(callback: () => unknown, code: PointResilienceError["code"]) {
  try {
    callback();
  } catch (error) {
    expect(error).toBeInstanceOf(PointResilienceError);
    expect((error as PointResilienceError).code).toBe(code);
    return;
  }
  throw new Error(`Era esperado PointResilienceError com código ${code}.`);
}

describe("PointResilienceHarness — criação idempotente", () => {
  it("executa uma única chamada externa quando o caixa repete a mesma chave de idempotência", async () => {
    const harness = new PointResilienceHarness();
    const provider = vi.fn().mockResolvedValue({ orderId: "ORD-POINT-001", paymentId: "PAY-POINT-001", status: "at_terminal" as const });
    const request = { id: "attempt-001", orderId: "order-1042", terminalId: "terminal-a", idempotencyKey: "8a24eb9e-e163-4891-90da-5abb63060360", externalReference: "fsa-pos-order-1042", amountCents: 6990 };

    const [first, retry] = await Promise.all([harness.createPointOrder(request, provider), harness.createPointOrder(request, provider)]);

    expect(first.providerCallMade).toBe(true);
    expect(retry.providerCallMade).toBe(false);
    expect(provider).toHaveBeenCalledTimes(1);
    expect(first.attempt.providerOrderId).toBe("ORD-POINT-001");
  });

  it("rejeita reutilização de chave com dados de cobrança diferentes", () => {
    const harness = new PointResilienceHarness();
    harness.reserveAttempt({ id: "attempt-001", orderId: "order-1042", terminalId: "terminal-a", idempotencyKey: "same-key", externalReference: "fsa-pos-order-1042", amountCents: 6990 });

    expectPointError(() => harness.reserveAttempt({ id: "attempt-002", orderId: "order-1042", terminalId: "terminal-a", idempotencyKey: "same-key", externalReference: "fsa-pos-order-1042", amountCents: 7990 }), "idempotency_conflict");
  });

  it("bloqueia tentativas simultâneas com chaves diferentes para o mesmo pedido", () => {
    const harness = new PointResilienceHarness();
    harness.reserveAttempt({ id: "attempt-001", orderId: "order-1042", terminalId: "terminal-a", idempotencyKey: "key-a", externalReference: "fsa-pos-order-1042", amountCents: 6990 });

    expectPointError(() => harness.reserveAttempt({ id: "attempt-002", orderId: "order-1042", terminalId: "terminal-b", idempotencyKey: "key-b", externalReference: "fsa-pos-order-1042b", amountCents: 6990 }), "open_attempt");
  });

  it("preserva a tentativa para reconciliação se houver timeout/falha após iniciar a criação externa", async () => {
    const harness = new PointResilienceHarness();
    const request = { id: "attempt-001", orderId: "order-1042", terminalId: "terminal-a", idempotencyKey: "key-timeout", externalReference: "fsa-pos-order-1042", amountCents: 6990 };

    await expect(harness.createPointOrder(request, async () => { throw new Error("timeout"); })).rejects.toThrow("timeout");
    expect(harness.getAttempt("key-timeout")).toMatchObject({ status: "reconciliation_required", failureCode: "provider_create_failed" });
  });
});

describe("PointResilienceHarness — webhook", () => {
  it("liquida uma confirmação Point válida exatamente uma vez", () => {
    const harness = preparedHarness();

    const result = harness.processWebhook(signedWebhook(payload()));

    expect(result).toMatchObject({ settled: true, duplicate: false });
    expect(harness.getSettlementCount()).toBe(1);
    expect(harness.getAttempt("8a24eb9e-e163-4891-90da-5abb63060360")).toMatchObject({ status: "processed", settlementApplied: true });
  });

  it("ignora reentrega idêntica sem baixar estoque ou criar novo pagamento", () => {
    const harness = preparedHarness();
    const event = signedWebhook(payload());

    harness.processWebhook(event);
    const replay = harness.processWebhook(event);

    expect(replay).toMatchObject({ duplicate: true, settled: false });
    expect(harness.getSettlementCount()).toBe(1);
  });

  it("não liquida a mesma ordem se o provedor reenviar a confirmação com versão diferente", () => {
    const harness = preparedHarness();
    harness.processWebhook(signedWebhook(payload()));

    const newerVersion = payload({ data: { version: 4 } });
    const result = harness.processWebhook(signedWebhook(newerVersion, "request-point-002"));

    expect(result).toMatchObject({ duplicate: true, settled: false });
    expect(harness.getSettlementCount()).toBe(1);
  });

  it("rejeita assinatura adulterada e não registra liquidação", () => {
    const harness = preparedHarness();
    const event = signedWebhook(payload());

    expectPointError(() => harness.processWebhook({ ...event, signature: event.signature.replace(/.$/, "0") }), "invalid_webhook");
    expect(harness.getSettlementCount()).toBe(0);
  });

  it("rejeita replay com timestamp expirado antes de processar a cobrança", () => {
    const harness = preparedHarness();
    const expired = "1718824499";
    const requestId = "request-point-expired";
    const webhookPayload = payload();
    const signature = `ts=${expired},v1=${createHmac("sha256", secret).update(`id:${webhookPayload.data.id};request-id:${requestId};ts:${expired};`).digest("hex")}`;

    expectPointError(() => harness.processWebhook({ payload: webhookPayload, signature, requestId, secret, now }), "invalid_webhook");
    expect(harness.getSettlementCount()).toBe(0);
  });

  it("abre reconciliação quando referência externa ou valor não corresponde", () => {
    const referenceHarness = preparedHarness();
    expectPointError(() => referenceHarness.processWebhook(signedWebhook(payload({ data: { external_reference: "fsa-pos-other-order" } }))), "reconciliation_required");
    expect(referenceHarness.getAttempt("8a24eb9e-e163-4891-90da-5abb63060360")).toMatchObject({ status: "reconciliation_required", failureCode: "external_reference_mismatch" });

    const amountHarness = preparedHarness();
    expectPointError(() => amountHarness.processWebhook(signedWebhook(payload({ data: { total_paid_amount: "49.90" } }))), "reconciliation_required");
    expect(amountHarness.getAttempt("8a24eb9e-e163-4891-90da-5abb63060360")).toMatchObject({ status: "reconciliation_required", failureCode: "amount_mismatch" });
  });

  it("trata estados de terminal, falha e expiração sem liquidar estoque", () => {
    const actionHarness = preparedHarness();
    actionHarness.processWebhook(signedWebhook(payload({ action: "order.action_required", data: { status: "action_required", total_paid_amount: undefined } })));
    expect(actionHarness.getAttempt("8a24eb9e-e163-4891-90da-5abb63060360")).toMatchObject({ status: "action_required" });
    expect(actionHarness.getSettlementCount()).toBe(0);

    const failedHarness = preparedHarness();
    failedHarness.processWebhook(signedWebhook(payload({ action: "order.failed", data: { status: "failed", total_paid_amount: undefined } })));
    expect(failedHarness.getAttempt("8a24eb9e-e163-4891-90da-5abb63060360")).toMatchObject({ status: "failed" });
    expect(failedHarness.getSettlementCount()).toBe(0);
  });

  it("rejeita notificações de ordem desconhecida sem alterar estoque", () => {
    const harness = new PointResilienceHarness();

    expect(() => harness.processWebhook(signedWebhook(payload()))).toThrow(PointResilienceError);
    expect(harness.getSettlementCount()).toBe(0);
  });
});
