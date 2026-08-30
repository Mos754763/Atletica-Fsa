import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock, heartbeatInsertMock, processEmailOutboxMock, testEnv } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
  heartbeatInsertMock: vi.fn(),
  processEmailOutboxMock: vi.fn(),
  testEnv: { cronSecret: "cron-test-secret" as string | undefined },
}));

vi.mock("@/lib/env", () => ({ env: testEnv }));
vi.mock("@/lib/api/cron-auth", () => ({ isAuthorizedCronRequest: (authorization: string | null, secret: string | undefined) => Boolean(secret && authorization === `Bearer ${secret}`) }));
vi.mock("@/lib/email/transactional", () => ({ processEmailOutbox: processEmailOutboxMock }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: createServiceClientMock }));

import { GET, POST } from "./route";

describe("worker HTTP da outbox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testEnv.cronSecret = "cron-test-secret";
    heartbeatInsertMock.mockResolvedValue({ error: null });
    createServiceClientMock.mockReturnValue({ from: vi.fn(() => ({ insert: heartbeatInsertMock })) });
    processEmailOutboxMock.mockResolvedValue({ processed: 2, sent: 2, failed: 0, deadLettered: 0 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("nega chamadas sem o segredo antes de acessar o banco", async () => {
    const response = await GET(new Request("https://example.test/api/cron/email-outbox"));

    expect(response.status).toBe(401);
    expect(createServiceClientMock).not.toHaveBeenCalled();
    expect(processEmailOutboxMock).not.toHaveBeenCalled();
  });

  it("processa POST autenticado e registra heartbeat saudável", async () => {
    const response = await POST(new Request("https://example.test/api/cron/email-outbox", { method: "POST", headers: { Authorization: "Bearer cron-test-secret" } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ ok: true, processing: { processed: 2, sent: 2 } });
    expect(processEmailOutboxMock).toHaveBeenCalledWith(50);
    expect(heartbeatInsertMock).toHaveBeenCalledWith(expect.objectContaining({ route_path: "/api/cron/email-outbox", status: "succeeded" }));
  });

  it("falha a rota quando o heartbeat saudável não é persistido", async () => {
    heartbeatInsertMock.mockResolvedValueOnce({ error: { code: "42501" } }).mockResolvedValueOnce({ error: null });

    const response = await GET(new Request("https://example.test/api/cron/email-outbox", { headers: { Authorization: "Bearer cron-test-secret" } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "O processamento da fila de e-mail falhou; consulte os logs." });
    expect(heartbeatInsertMock).toHaveBeenCalledTimes(2);
    expect(heartbeatInsertMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: "failed" }));
  });

  it("não vaza nem lança quando o heartbeat de falha também falha", async () => {
    processEmailOutboxMock.mockRejectedValue(new Error("database internal detail"));
    heartbeatInsertMock.mockResolvedValue({ error: { code: "42501" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request("https://example.test/api/cron/email-outbox", { headers: { Authorization: "Bearer cron-test-secret" } }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "O processamento da fila de e-mail falhou; consulte os logs." });
    expect(errorSpy).toHaveBeenCalledWith("[email-outbox] falha ao registrar heartbeat de erro", { errorCode: "42501" });
  });

  it("sinaliza dead letter sem descartar a fila", async () => {
    processEmailOutboxMock.mockResolvedValue({ processed: 1, sent: 0, failed: 1, deadLettered: 1 });

    const response = await GET(new Request("https://example.test/api/cron/email-outbox", { headers: { Authorization: "Bearer cron-test-secret" } }));

    expect(response.status).toBe(503);
    expect(heartbeatInsertMock).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", detail: expect.stringContaining("1 mensagem") }));
  });

  it("mantém mensagens pendentes e registra falha quando o provedor não está configurado", async () => {
    processEmailOutboxMock.mockResolvedValue({ processed: 0, sent: 0, failed: 0, deadLettered: 0, skipped: "not_configured" });

    const response = await GET(new Request("https://example.test/api/cron/email-outbox", { headers: { Authorization: "Bearer cron-test-secret" } }));

    expect(response.status).toBe(503);
    expect(heartbeatInsertMock).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", detail: expect.stringContaining("sem configuração") }));
  });
});
