import { createHash } from "node:crypto";
import { isMercadoPagoAmountMatching, isMercadoPagoWebhookFresh, verifyMercadoPagoWebhook } from "./mercado-pago";

export type PointAttemptStatus = "creating" | "created" | "at_terminal" | "action_required" | "processed" | "failed" | "cancelled" | "expired" | "refunded" | "reconciliation_required";

export type PointAttempt = {
  id: string;
  orderId: string;
  terminalId: string;
  idempotencyKey: string;
  externalReference: string;
  amountCents: number;
  status: PointAttemptStatus;
  providerOrderId?: string;
  providerPaymentId?: string;
  settlementApplied: boolean;
  failureCode?: string;
};

export type PointWebhookPayload = {
  action: string;
  type: "order";
  data: {
    id: string;
    external_reference?: string;
    status: string;
    status_detail?: string;
    total_paid_amount?: string | number;
    type?: "point";
    version?: number;
    transactions?: { payments?: Array<{ id: string; amount?: string | number; paid_amount?: string | number; status?: string }> };
  };
};

type ReserveInput = Pick<PointAttempt, "id" | "orderId" | "terminalId" | "idempotencyKey" | "externalReference" | "amountCents">;
type ProviderOrder = { orderId: string; paymentId?: string; status: "created" | "at_terminal" };

export class PointResilienceError extends Error {
  constructor(message: string, readonly code: "idempotency_conflict" | "open_attempt" | "invalid_webhook" | "unknown_attempt" | "reconciliation_required") {
    super(message);
    this.name = "PointResilienceError";
  }
}

function parseProviderAmount(value: string | number | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value)) return undefined;
  return Number(value);
}

function isOpen(status: PointAttemptStatus) {
  return status === "creating" || status === "created" || status === "at_terminal" || status === "action_required" || status === "reconciliation_required";
}

export function buildPointWebhookDedupeKey(payload: PointWebhookPayload) {
  const paymentIds = payload.data.transactions?.payments?.map((payment) => payment.id).sort().join(",") ?? "";
  const semanticEvent = ["mercado_pago", payload.action, payload.data.id, payload.data.status, paymentIds, String(payload.data.version ?? "")].join("|");
  return createHash("sha256").update(semanticEvent).digest("hex");
}

/**
 * Modelo em memória usado somente pelos testes. Ele reproduz as garantias que a
 * migration/RPC Point deverá fornecer: chave idempotente, uma tentativa aberta por
 * pedido, deduplicação semântica e baixa de estoque aplicada no máximo uma vez.
 */
export class PointResilienceHarness {
  private readonly attemptsByIdempotencyKey = new Map<string, PointAttempt>();
  private readonly attemptsByProviderOrderId = new Map<string, PointAttempt>();
  private readonly webhookEvents = new Set<string>();
  private readonly openAttemptByOrderId = new Map<string, string>();
  private settlementCount = 0;

  reserveAttempt(input: ReserveInput) {
    const existing = this.attemptsByIdempotencyKey.get(input.idempotencyKey);
    if (existing) {
      const sameRequest = existing.orderId === input.orderId && existing.terminalId === input.terminalId && existing.externalReference === input.externalReference && existing.amountCents === input.amountCents;
      if (!sameRequest) throw new PointResilienceError("A chave de idempotência pertence a outra tentativa Point.", "idempotency_conflict");
      return { attempt: existing, reused: true };
    }

    if (this.openAttemptByOrderId.has(input.orderId)) throw new PointResilienceError("Já existe uma tentativa Point aberta para este pedido.", "open_attempt");
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(input.externalReference)) throw new PointResilienceError("Referência externa Point inválida.", "idempotency_conflict");
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new PointResilienceError("Valor Point inválido.", "idempotency_conflict");

    const attempt: PointAttempt = { ...input, status: "creating", settlementApplied: false };
    this.attemptsByIdempotencyKey.set(input.idempotencyKey, attempt);
    this.openAttemptByOrderId.set(input.orderId, input.id);
    return { attempt, reused: false };
  }

  bindProviderOrder(attemptId: string, providerOrder: ProviderOrder) {
    const attempt = [...this.attemptsByIdempotencyKey.values()].find((candidate) => candidate.id === attemptId);
    if (!attempt) throw new PointResilienceError("Tentativa Point não encontrada.", "unknown_attempt");
    if (attempt.providerOrderId && attempt.providerOrderId !== providerOrder.orderId) throw new PointResilienceError("Tentativa Point vinculada a outra order do provedor.", "reconciliation_required");

    attempt.providerOrderId = providerOrder.orderId;
    attempt.providerPaymentId = providerOrder.paymentId;
    attempt.status = providerOrder.status;
    this.attemptsByProviderOrderId.set(providerOrder.orderId, attempt);
    return attempt;
  }

  async createPointOrder(input: ReserveInput, createProviderOrder: () => Promise<ProviderOrder>) {
    const reservation = this.reserveAttempt(input);
    if (reservation.reused) return { attempt: reservation.attempt, providerCallMade: false };

    try {
      const providerOrder = await createProviderOrder();
      return { attempt: this.bindProviderOrder(reservation.attempt.id, providerOrder), providerCallMade: true };
    } catch (error) {
      reservation.attempt.status = "reconciliation_required";
      reservation.attempt.failureCode = "provider_create_failed";
      throw error;
    }
  }

  processWebhook(input: { payload: PointWebhookPayload; signature: string | null; requestId: string | null; secret: string; now?: number }) {
    const dataId = input.payload.data.id;
    const signatureValid = verifyMercadoPagoWebhook({ signature: input.signature, requestId: input.requestId, dataId, secret: input.secret });
    if (!signatureValid || !isMercadoPagoWebhookFresh(input.signature, input.now)) throw new PointResilienceError("Webhook Point inválido, ausente ou expirado.", "invalid_webhook");
    if (input.payload.type !== "order" || input.payload.data.type !== "point") throw new PointResilienceError("Webhook não pertence a uma order Point.", "invalid_webhook");

    const dedupeKey = buildPointWebhookDedupeKey(input.payload);
    if (this.webhookEvents.has(dedupeKey)) return { duplicate: true, settled: false, dedupeKey };
    this.webhookEvents.add(dedupeKey);

    const attempt = this.attemptsByProviderOrderId.get(dataId);
    if (!attempt) throw new PointResilienceError("Order Point sem tentativa local correspondente.", "unknown_attempt");
    if (attempt.externalReference !== input.payload.data.external_reference) {
      attempt.status = "reconciliation_required";
      attempt.failureCode = "external_reference_mismatch";
      throw new PointResilienceError("Referência externa não corresponde à tentativa Point.", "reconciliation_required");
    }

    const amount = parseProviderAmount(input.payload.data.total_paid_amount);
    if (input.payload.action === "order.processed" && !isMercadoPagoAmountMatching(amount, attempt.amountCents)) {
      attempt.status = "reconciliation_required";
      attempt.failureCode = "amount_mismatch";
      throw new PointResilienceError("Valor recebido diverge da tentativa Point.", "reconciliation_required");
    }

    const payment = input.payload.data.transactions?.payments?.[0];
    if (input.payload.action === "order.processed" && input.payload.data.status === "processed") {
      const alreadySettled = attempt.settlementApplied;
      attempt.status = "processed";
      attempt.providerPaymentId = payment?.id ?? attempt.providerPaymentId;
      attempt.settlementApplied = true;
      this.openAttemptByOrderId.delete(attempt.orderId);
      if (!alreadySettled) this.settlementCount += 1;
      return { duplicate: alreadySettled, settled: !alreadySettled, dedupeKey };
    }

    const statusByAction: Record<string, PointAttemptStatus> = {
      "order.action_required": "action_required",
      "order.failed": "failed",
      "order.canceled": "cancelled",
      "order.expired": "expired",
      "order.refunded": "refunded",
    };
    const status = statusByAction[input.payload.action];
    if (!status) {
      attempt.status = "reconciliation_required";
      attempt.failureCode = "unsupported_action";
      throw new PointResilienceError("Ação Point não suportada exige reconciliação.", "reconciliation_required");
    }
    attempt.status = status;
    if (!isOpen(status)) this.openAttemptByOrderId.delete(attempt.orderId);
    return { duplicate: false, settled: false, dedupeKey };
  }

  getSettlementCount() { return this.settlementCount; }
  getAttempt(idempotencyKey: string) { return this.attemptsByIdempotencyKey.get(idempotencyKey); }
}
