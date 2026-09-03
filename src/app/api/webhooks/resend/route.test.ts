import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock, rpcMock, testEnv, verifyMock } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
  rpcMock: vi.fn(),
  testEnv: { resendWebhookSecret: "whsec_test" as string | undefined },
  verifyMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: testEnv }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: createServiceClientMock }));
vi.mock("@/lib/email/resend-webhook", () => ({
  verifyResendWebhookSignature: verifyMock,
  parseResendWebhookEvent: vi.fn((payload: string) => JSON.parse(payload)),
}));

import { POST } from "./route";

const event = {
  type: "email.bounced",
  created_at: "2026-08-30T01:00:00.000Z",
  data: { email_id: "resend-message-1", to: ["bounce@example.com"] },
};

function request(body = JSON.stringify(event), extraHeaders: Record<string, string> = {}) {
  return new Request("https://example.test/api/webhooks/resend", {
    method: "POST",
    headers: {
      "svix-id": "msg_webhook_1",
      "svix-timestamp": "1788051600",
      "svix-signature": "v1,assinatura",
      ...extraHeaders,
    },
    body,
  });
}

describe("rota de feedback do Resend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testEnv.resendWebhookSecret = "whsec_test";
    verifyMock.mockReturnValue(true);
    rpcMock.mockResolvedValue({ data: { accepted: true, duplicate: false }, error: null });
    createServiceClientMock.mockReturnValue({ rpc: rpcMock });
  });

  it("falha fechada quando o segredo ainda não foi configurado", async () => {
    testEnv.resendWebhookSecret = undefined;
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(verifyMock).not.toHaveBeenCalled();
    expect(createServiceClientMock).not.toHaveBeenCalled();
  });

  it("rejeita assinatura inválida sem tocar no banco", async () => {
    verifyMock.mockReturnValue(false);
    const response = await POST(request());
    expect(response.status).toBe(401);
    expect(createServiceClientMock).not.toHaveBeenCalled();
  });

  it("persiste evento verificado pelo svix-id de forma idempotente", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(rpcMock).toHaveBeenCalledWith("ingest_resend_email_event", expect.objectContaining({
      p_event_id: "msg_webhook_1",
      p_event_type: "email.bounced",
      p_provider_message_id: "resend-message-1",
      p_recipient_email: "bounce@example.com",
    }));
  });

  it("recusa payload acima de 128 KiB antes de validar assinatura", async () => {
    const response = await POST(request("{}", { "content-length": String(129 * 1024) }));
    expect(response.status).toBe(413);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("devolve 503 para provocar retry quando a persistência falha", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "XX000" } });
    const response = await POST(request());
    expect(response.status).toBe(503);
  });
});
