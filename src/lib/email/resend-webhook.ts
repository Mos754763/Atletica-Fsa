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
    to: [string];
  };
};

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function decodeBase64(value: string) {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return null;
  const unpadded = value.replace(/=+$/, "");
  if (unpadded.length % 4 === 1) return null;
  const decoded = Buffer.from(value, "base64");
  // Buffer tolera caracteres/padding inválidos; compare a codificação canônica
  // para evitar que representações ambíguas sejam aceitas em material secreto.
  if (!decoded.length || decoded.toString("base64").replace(/=+$/, "") !== unpadded) return null;
  return decoded;
}

function decodeWebhookSecret(secret: string) {
  if (!secret.startsWith("whsec_")) return null;
  const decoded = decodeBase64(secret.slice("whsec_".length));
  return decoded && decoded.length >= 16 ? decoded : null;
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
    const received = decodeBase64(encoded);
    if (!received) return false;
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
  if (!Array.isArray(data.to) || data.to.length !== 1 || typeof data.to[0] !== "string" || !data.to[0].trim()) return null;
  return parsed as ResendWebhookEvent;
}
