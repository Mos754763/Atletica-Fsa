import { createHmac, timingSafeEqual } from "node:crypto";

type SignatureInput = { signature: string | null; requestId: string | null; dataId: string | null; secret: string };
type FetchLike = typeof fetch;

export const MERCADO_PAGO_WEBHOOK_MAX_AGE_MS = 5 * 60 * 1000;

export class MercadoPagoApiError extends Error {
  constructor(message: string, readonly status?: number) { super(message); this.name = "MercadoPagoApiError"; }
}

function getSignatureParts(signature: string | null) {
  if (!signature) return new Map<string, string>();
  return new Map(signature.split(",").map((part) => { const [key, value] = part.trim().split("="); return [key, value]; }));
}

export function getMercadoPagoWebhookTimestamp(signature: string | null) {
  const timestamp = getSignatureParts(signature).get("ts");
  if (!timestamp || !/^\d{10,13}$/.test(timestamp)) return null;
  const numericTimestamp = Number(timestamp);
  if (!Number.isSafeInteger(numericTimestamp)) return null;
  return timestamp.length === 10 ? numericTimestamp * 1000 : numericTimestamp;
}

export function isMercadoPagoWebhookFresh(signature: string | null, now = Date.now(), maxAgeMs = MERCADO_PAGO_WEBHOOK_MAX_AGE_MS) {
  const timestamp = getMercadoPagoWebhookTimestamp(signature);
  return timestamp !== null && timestamp <= now + 60_000 && now - timestamp <= maxAgeMs;
}

export function verifyMercadoPagoWebhook({ signature, requestId, dataId, secret }: SignatureInput) {
  if (!signature || !requestId || !dataId || !secret) return false;
  const parts = getSignatureParts(signature);
  const timestamp = parts.get("ts"); const receivedHash = parts.get("v1");
  if (!timestamp || !receivedHash) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");
  if (receivedHash.length !== expectedHash.length) return false;
  return timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash));
}

export function isMercadoPagoAmountMatching(transactionAmount: number | undefined, expectedCents: number) {
  if (!Number.isFinite(transactionAmount) || !Number.isInteger(expectedCents) || expectedCents < 0) return false;
  return Math.round((transactionAmount as number) * 100) === expectedCents;
}

export function shouldRetryMercadoPagoStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

export async function fetchMercadoPagoPayment(paymentId: string, accessToken: string, options: { fetchImpl?: FetchLike; timeoutMs?: number; maxAttempts?: number; wait?: (milliseconds: number) => Promise<void> } = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const maxAttempts = options.maxAttempts ?? 3;
  const wait = options.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const url = `https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(timeoutMs) });
      if (response.ok) return response;
      if (!shouldRetryMercadoPagoStatus(response.status)) throw new MercadoPagoApiError("Pagamento não localizado no Mercado Pago.", response.status);
      lastError = new MercadoPagoApiError(`Mercado Pago indisponível: HTTP ${response.status}.`, response.status);
    } catch (error) {
      lastError = error;
      if (error instanceof MercadoPagoApiError && !shouldRetryMercadoPagoStatus(error.status ?? 0)) throw error;
    }

    if (attempt < maxAttempts - 1) await wait(250 * 2 ** attempt + Math.floor(Math.random() * 150));
  }

  if (lastError instanceof MercadoPagoApiError) throw lastError;
  throw new MercadoPagoApiError("Não foi possível consultar o Mercado Pago após retentativas.");
}
