import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createServiceClientMock, fetchMock, testEnv } = vi.hoisted(() => ({
  createServiceClientMock: vi.fn(),
  fetchMock: vi.fn(),
  testEnv: {
    resendApiKey: "re_test_outbox_contract" as string | undefined,
    emailFrom: "ATLETICA FSA <test@atleticafsa.site>",
  },
}));

vi.mock("@/lib/env", () => ({ env: testEnv }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: createServiceClientMock }));

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

function createOutboxClient(claimed: ClaimedEmail[] = [], templateResult: { data: { subject_template: string; html_template: string } | null; error: null | { code?: string } } = { data: null, error: null }) {
  const templateMaybeSingle = vi.fn().mockResolvedValue(templateResult);
  const templateIs = vi.fn(() => ({ maybeSingle: templateMaybeSingle }));
  const templateEq = vi.fn(() => ({ is: templateIs }));
  const templateSelect = vi.fn(() => ({ eq: templateEq }));
  const outboxInsert = vi.fn().mockResolvedValue({ error: null });
  const updateStatus = vi.fn().mockResolvedValue({ error: null });
  const updateId = vi.fn(() => ({ eq: updateStatus }));
  const outboxUpdate = vi.fn(() => ({ eq: updateId }));
  const rpc = vi.fn(async (name: string) => {
    if (name === "claim_email_outbox") return { data: claimed, error: null };
    if (name === "finish_email_outbox_delivery") return { data: true, error: null };
    if (name === "expire_stale_email_outbox") return { data: 0, error: null };
    return { data: null, error: null };
  });

  const client = {
    from: vi.fn((table: string) => {
      if (table === "email_templates") return { select: templateSelect };
      if (table === "email_outbox") return { insert: outboxInsert, update: outboxUpdate };
      throw new Error(`Tabela inesperada no teste: ${table}`);
    }),
    rpc,
  };

  return { client, outboxInsert, outboxUpdate, rpc };
}

describe("outbox transacional de e-mails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T00:00:00.000Z"));
    testEnv.resendApiKey = "re_test_outbox_contract";
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: vi.fn().mockResolvedValue(JSON.stringify({ id: "resend-message-1" })) });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("enfileira uma mensagem com chave de deduplicação determinística", async () => {
    const harness = createOutboxClient();
    createServiceClientMock.mockReturnValue(harness.client);

    const result = await sendTransactionalEmail({
      to: " Destinatario.Teste@Example.com ",
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

    await expect(sendTransactionalEmail({ to: "outbox-test@example.com", templateKey: "event_reminder", subject: "Lembrete", html: "<p>Teste</p>" }))
      .resolves.toEqual({ sent: false, queued: false, reason: "duplicate" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("persiste a intenção mesmo quando a credencial do Resend não está configurada", async () => {
    testEnv.resendApiKey = undefined;
    const harness = createOutboxClient();
    createServiceClientMock.mockReturnValue(harness.client);

    await expect(sendTransactionalEmail({ to: "outbox-test@example.com", templateKey: "event_reminder", subject: "Lembrete", html: "<p>Teste</p>" }))
      .resolves.toEqual({ sent: false, queued: true });
    expect(harness.outboxInsert).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propaga falha de persistência em vez de convertê-la em sucesso aparente", async () => {
    const harness = createOutboxClient();
    harness.outboxInsert.mockResolvedValue({ error: { code: "XX000", message: "database unavailable" } });
    createServiceClientMock.mockReturnValue(harness.client);

    await expect(sendTransactionalEmail({ to: "outbox-test@example.com", templateKey: "event_reminder", subject: "Lembrete", html: "<p>Teste</p>" }))
      .rejects.toThrow("Não foi possível persistir a intenção de e-mail");
  });

  it("escapa variáveis no HTML e remove quebras de linha do assunto", async () => {
    const harness = createOutboxClient([], { data: { subject_template: "Amanhã: {{eventTitle}}", html_template: "<p>{{eventTitle}}</p>" }, error: null });
    createServiceClientMock.mockReturnValue(harness.client);

    await sendTransactionalEmail({
      to: "outbox-test@example.com",
      templateKey: "event_reminder",
      variables: { eventTitle: "Final\r\nBCC: fraude <img src=x onerror=alert(1)> & festa" },
      subject: "fallback",
      html: "<p>fallback</p>",
    });

    expect(harness.outboxInsert).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Amanhã: Final BCC: fraude <img src=x onerror=alert(1)> & festa",
      html: expect.stringContaining("&lt;img src=x onerror=alert(1)&gt; &amp; festa"),
    }));
  });

  it("entrega com chave idempotente e finaliza outbox + delivery por RPC atômica", async () => {
    const harness = createOutboxClient([{ id: "outbox-1", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Lembrete", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 1, failed: 0, deadLettered: 0 });
    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "Idempotency-Key": "atletica-fsa/outbox/outbox-1" }),
    }));
    expect(harness.rpc).toHaveBeenCalledWith("finish_email_outbox_delivery", {
      p_outbox_id: "outbox-1",
      p_provider_message_id: "resend-message-1",
      p_sent_at: "2026-08-30T00:00:00.000Z",
    });
  });

  it("agenda retry exponencial após falha definida do provedor", async () => {
    const harness = createOutboxClient([{ id: "outbox-2", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Retry", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: vi.fn().mockResolvedValue(JSON.stringify({ message: "destinatário rejeitado" })) });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1, deadLettered: 0 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "pending",
      locked_at: null,
      last_error: "destinatário rejeitado",
      next_attempt_at: "2026-08-30T00:02:00.000Z",
    }));
  });

  it("move falha de transporte ambígua para dead letter na primeira tentativa", async () => {
    const harness = createOutboxClient([{ id: "outbox-network", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Ambígua", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    fetchMock.mockRejectedValue(new TypeError("network unavailable"));

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1, deadLettered: 1 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({
      status: "failed",
      locked_at: null,
      last_error: expect.stringContaining("resultado ambíguo"),
    }));
    expect(harness.rpc).toHaveBeenCalledTimes(2);
  });

  it("move resposta aceita sem id do provedor para dead letter na primeira tentativa", async () => {
    const harness = createOutboxClient([{ id: "outbox-no-id", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Ambígua", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: vi.fn().mockResolvedValue(JSON.stringify({})) });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1, deadLettered: 1 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", last_error: expect.stringContaining("sem retornar o identificador") }));
  });

  it("move HTTP ambíguo do Resend para dead letter na primeira tentativa", async () => {
    const harness = createOutboxClient([{ id: "outbox-503", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Ambígua", html: "<p>Teste</p>", attempts: 1 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    fetchMock.mockResolvedValue({ ok: false, status: 503, text: vi.fn().mockResolvedValue(JSON.stringify({ message: "timeout do provedor" })) });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1, deadLettered: 1 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", last_error: "timeout do provedor" }));
  });

  it("move para dead letter após a quinta tentativa falha", async () => {
    const harness = createOutboxClient([{ id: "outbox-3", recipient_email: "outbox-test@example.com", recipient_profile_id: null, template_key: "event_reminder", related_order_id: null, related_registration_id: null, subject: "Falha terminal", html: "<p>Teste</p>", attempts: 5 }]);
    createServiceClientMock.mockReturnValue(harness.client);
    fetchMock.mockResolvedValue({ ok: false, status: 422, text: vi.fn().mockResolvedValue(JSON.stringify({ message: "destinatário rejeitado" })) });

    await expect(processEmailOutbox(1)).resolves.toEqual({ processed: 1, sent: 0, failed: 1, deadLettered: 1 });
    expect(harness.outboxUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "failed", locked_at: null, last_error: "destinatário rejeitado" }));
  });

  it("preserva exclusão mútua e adiciona finalização atômica restrita ao service role", () => {
    const original = readFileSync(path.join(process.cwd(), "supabase/migrations/20260814140000_email_outbox_and_automation_rules.sql"), "utf8");
    const hardening = readFileSync(path.join(process.cwd(), "supabase/migrations/20260830000456_harden_email_outbox_delivery.sql"), "utf8");
    const pgtap = readFileSync(path.join(process.cwd(), "supabase/tests/email_outbox_delivery.sql"), "utf8");

    expect(original).toContain("dedupe_key text not null unique");
    expect(original).toContain("for update skip locked");
    expect(hardening).toContain("finish_email_outbox_delivery");
    expect(hardening).toContain("email_deliveries_provider_message_id_key");
    expect(hardening).toContain("pg_advisory_xact_lock");
    expect(hardening).not.toContain("on conflict do nothing");
    expect(hardening).toContain("grant execute on function public.finish_email_outbox_delivery(uuid, text, timestamptz) to service_role");
    expect(pgtap).toContain("select plan(16)");
    expect(pgtap).toContain("same provider id on a distinct processing outbox raises unique_violation");
    expect(pgtap).toContain("collision rolls the second outbox back to processing");
    expect(pgtap).toMatch(/^begin;[\s\S]*select \* from finish\(\);\s*rollback;\s*$/);
  });
});
