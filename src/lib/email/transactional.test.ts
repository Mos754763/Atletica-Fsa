import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock, resendSendMock, testEnv } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
  resendSendMock: vi.fn(),
  testEnv: {
    resendApiKey: "re_test_outbox_contract" as string | undefined,
    emailFrom: "ATLETICA FSA <test@atleticafsa.site>",
  },
}));

vi.mock("@/lib/env", () => ({ env: testEnv }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: createServiceClientMock }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: resendSendMock } })),
}));

import { processEmailOutbox, sendTransactionalEmail } from "./transactional";

type ClaimedEmail = {
  id: string;
  recipient_email: string;
  recipient_profile_id: string | null;
  template_key: string;
  related_order_id: string | null;
  related_registration_id: string | null;
  subject: string;
  html: string;
  attempts: number;
};

function createOutboxClient(claimed: ClaimedEmail[] = []) {
  const templateMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const templateIs = vi.fn(() => ({ maybeSingle: templateMaybeSingle }));
  const templateEq = vi.fn(() => ({ is: templateIs }));
  const templateSelect = vi.fn(() => ({ eq: templateEq }));
  const outboxInsert = vi.fn().mockResolvedValue({ error: null });
  const updateStatus = vi.fn().mockResolvedValue({ error: null });
  const updateId = vi.fn(() => ({ eq: updateStatus }));
  const outboxUpdate = vi.fn(() => ({ eq: updateId }));
  const deliveryInsert = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_email_outbox") return { data: claimed, error: null };
    if (name === "expire_stale_email_outbox") return { data: 0, error: null };
    return { data: null, error: null };
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "email_templates") return { select: templateSelect };
      if (table === "email_outbox") return { insert: outboxInsert, update: outboxUpdate };
      if (table === "email_deliveries") return { insert: deliveryInsert };
      throw new Error(`Tabela inesperada no teste: ${table}`);
    }),
    rpc,
  };

  return { client, outboxInsert, outboxUpdate, deliveryInsert, rpc };
}

describe("outbox transacional de e-mails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-20T12:00:00.000Z"));
    testEnv.resendApiKey = "re_test_outbox_contract";
  });

  afterEach(() => vi.useRealTimers());

  it("enfileira uma mensagem com chave de deduplicação determinística", async () => {
    const harness = createOutboxClient();
    createServiceClientMock.mockReturnValue(harness.client);

    const result = await sendTransactionalEmail({
      to: "Destinatario.Teste@Example.com",
      templateKey: "order_status",
      relatedOrderId: "order-123",
      subject: "Pedido atualizado",
      html: "<p>Conteúdo de teste</p>",
    });

    expect(result).toEqual({ sent: false, queued: true });
    expect(harness.outboxInsert).toHaveBeenCalledWith(expect.objectContaining({
      dedupe_key: "order_status:destinatario.teste@example.com:order-123",
      recipient_email: "Destinatario.Teste@Example.com",
      priority: 90,
    }));
  });

  it("trata colisão de deduplicação como resultado seguro sem reenfileirar", async () => {
    const harness = createOutboxClient();
    harness.outboxInsert.mockResolvedValue({ error: { code: "23505" } });
    createServiceClientMock.mockReturnValue(harness.client);

    await expect(sendTransactionalEmail({
      to: "outbox-test@example.com",
      templateKey: "event_reminder",
      subject: "Lembrete",
      html: "<p>Teste</p>",
    })).resolves.toEqual({ sent: false, queued: false, reason: "duplicate" });
    expect(resendSendMock).not.toHaveBeenCalled();
  });

  it("não cria fila quando a credencial do provedor não está configurada", async () => {
    testEnv.resendApiKey = undefined;

    await expect(sendTransactionalEmail({
      to: "outbox-test@example.com",
      templateKey: "event_reminder",
      subject: "Lembrete",
      html: "<p>Teste</p>",
    })).resolves.toEqual({ sent: false, queued: false, reason: "not_configured" });
    expect(createServiceClientMock).not.toHaveBeenCalled();
  });

  it("entrega uma mensagem reivindicada, registra o provedor e libera o lock", async () => {
    const claimed: ClaimedEmail[] = [{
      id: "outbox-1",
      recipient_email: "outbox-test@example.com",
      recipient_profile_id: null,
      template_key: "event_reminder",
      related_order_id: null,
      related_registration_id: null,
      subject: "Lembrete de teste",
      html: "<p>Teste</p>",
      attempts: 1,
    }];
    const harness = createOutboxClient(claimed);
    createServiceClientMock.mockReturnValue(harness.client);
    resendSendMock.mockResolvedValue({ data: { id: "resend-message-1" }, error: null });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 1, failed: 0 });
    expect(resendSendMock).toHaveBeenCalledWith(expect.objectContaining({
      from: testEnv.emailFrom,
      to: "outbox-test@example.com",
      subject: "Lembrete de teste",
    }));
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "sent",
      provider_message_id: "resend-message-1",
      locked_at: null,
      last_error: null,
    }));
    expect(harness.deliveryInsert).toHaveBeenCalledWith(expect.objectContaining({
      provider_message_id: "resend-message-1",
      recipient_email: "outbox-test@example.com",
    }));
    expect(harness.rpc).toHaveBeenCalledWith("expire_stale_email_outbox");
  });

  it("agenda retry exponencial após falha transitória sem marcar a mensagem como enviada", async () => {
    const harness = createOutboxClient([{ id: "outbox-2", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Retry", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    resendSendMock.mockResolvedValue({ data: null, error: { message: "timeout do provedor" } });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      locked_at: null,
      last_error: "timeout do provedor",
      next_attempt_at: "2026-08-20T12:02:00.000Z",
    }));
    expect(harness.deliveryInsert).not.toHaveBeenCalled();
  });

  it("encerra a mensagem após a quinta tentativa falha", async () => {
    const harness = createOutboxClient([{ id: "outbox-3", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Falha terminal", html: "<p>Teste</p>", attempts: 5 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    resendSendMock.mockResolvedValue({ data: null, error: { message: "destinatário rejeitado" } });

    await processEmailOutbox(1);
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "failed",
      locked_at: null,
      last_error: "destinatário rejeitado",
    }));
  });

  it("preserva o contrato SQL de exclusão mútua e deduplicação da fila", () => {
    const migration = readFileSync(path.join(process.cwd(), "supabase/migrations/20260814140000_email_outbox_and_automation_rules.sql"), "utf8");

    expect(migration).toContain("dedupe_key text not null unique");
    expect(migration).toContain("for update skip locked");
    expect(migration).toContain("attempts < 5");
    expect(migration).toContain("limit greatest(1, least(coalesce(p_limit, 25), 50))");
  });
});
