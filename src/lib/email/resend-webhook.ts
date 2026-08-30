import { createHmac, timingSafeEqual } from "node:crypto";

export const RESEND_WEBHOOK_EVENT_TYPES = [
  "email.delivered",
  "email.bounced",
  "email.complained",
  "email.failed",
  "email.suppressed",
] as const;

export type ResendWebhookEventType = (typeof RESEND_WEBHOOK_EVENT_TYPES)[number];
export type ResendWebhookEvent = {
  type: ResendWebhookEventType;
  created_at: string;
  data: {
    email_id: string;
    to: string[];
  };
};

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function decodeWebhookSecret(secret: string) {
  if (!secret.startsWith("whsec_")) return null;
  const encoded = secret.slice("whsec_".length);
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  const decoded = Buffer.from(encoded, "base64");
  return decoded.length >= 16 ? decoded : null;
}

export function verifyResendWebhookSignature(input: {
  payload: string;
  id: string;
  timestamp: string;
  signature: string;
  secret: string;
  now?: Date;
}) {
  const timestamp = Number(input.timestamp);
  if (!Number.isSafeInteger(timestamp)) return false;
  const nowSeconds = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSeconds - timestamp) > MAX_CLOCK_SKEW_SECONDS) return false;

  const secret = decodeWebhookSecret(input.secret);
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${input.id}.${input.timestamp}.${input.payload}`)
    .digest();

  return input.signature.split(/\s+/).some((candidate) => {
    const [version, encoded] = candidate.split(",", 2);
    if (version !== "v1" || !encoded) return false;
    let received: Buffer;
    try { received = Buffer.from(encoded, "base64"); } catch { return false; }
    return received.length === expected.length && timingSafeEqual(received, expected);
  });
}

export function parseResendWebhookEvent(payload: string): ResendWebhookEvent | null {
  let parsed: unknown;
  try { parsed = JSON.parse(payload); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  const value = parsed as { type?: unknown; created_at?: unknown; data?: unknown };
  if (!RESEND_WEBHOOK_EVENT_TYPES.includes(value.type as ResendWebhookEventType)) return null;
  if (typeof value.created_at !== "string" || !Number.isFinite(Date.parse(value.created_at))) return null;
  if (!value.data || typeof value.data !== "object") return null;
  const data = value.data as { email_id?: unknown; to?: unknown };
  if (typeof data.email_id !== "string" || !data.email_id.trim()) return null;
  if (!Array.isArray(data.to) || data.to.length < 1 || data.to.length > 50 || data.to.some((item) => typeof item !== "string" || !item.trim())) return null;
  return parsed as ResendWebhookEvent;
}
