import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { parseResendWebhookEvent, verifyResendWebhookSignature } from "./resend-webhook";

const signingKey = Buffer.from("resend-webhook-test-key-32-bytes!!");
const secret = `whsec_${signingKey.toString("base64")}`;
const payload = JSON.stringify({
  type: "email.complained",
  created_at: "2026-08-30T01:00:00.000Z",
  data: { email_id: "resend-message-1", to: ["destinatario@example.com"] },
});
const timestamp = "1788051600";
const id = "msg_webhook_1";

function signature(body = payload) {
  return `v1,${createHmac("sha256", signingKey).update(`${id}.${timestamp}.${body}`).digest("base64")}`;
}

describe("webhook do Resend", () => {
  it("aceita assinatura Svix válida sobre o corpo bruto", () => {
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature: signature(), secret, now: new Date("2026-08-30T01:00:00.000Z") })).toBe(true);
  });

  it("rejeita corpo alterado, timestamp antigo e segredo malformado", () => {
    const now = new Date("2026-08-30T01:00:00.000Z");
    expect(verifyResendWebhookSignature({ payload: `${payload} `, id, timestamp, signature: signature(), secret, now })).toBe(false);
    expect(verifyResendWebhookSignature({ payload, id, timestamp: "1788051200", signature: signature(), secret, now })).toBe(false);
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature: signature(), secret: "inseguro", now })).toBe(false);
  });

  it("aceita uma das múltiplas assinaturas Svix e rejeita Base64 não canônico", () => {
    const now = new Date("2026-08-30T01:00:00.000Z");
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature: `v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA= ${signature()}`, secret, now })).toBe(true);
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature: `${signature()}!`, secret, now })).toBe(false);
    expect(verifyResendWebhookSignature({ payload, id, timestamp, signature: signature(), secret: `${secret}=`, now })).toBe(false);
  });

  it("valida somente eventos de feedback necessários e destinatários presentes", () => {
    expect(parseResendWebhookEvent(payload)).toMatchObject({ type: "email.complained", data: { email_id: "resend-message-1" } });
    expect(parseResendWebhookEvent(JSON.stringify({ type: "email.opened", created_at: "2026-08-30T01:00:00Z", data: { email_id: "x", to: ["a@example.com"] } }))).toBeNull();
    expect(parseResendWebhookEvent(JSON.stringify({ type: "email.bounced", created_at: "inválido", data: { email_id: "x", to: [] } }))).toBeNull();
    expect(parseResendWebhookEvent(JSON.stringify({ type: "email.bounced", created_at: "2026-08-30T01:00:00Z", data: { email_id: "x", to: ["a@example.com", "b@example.com"] } }))).toBeNull();
  });
});
