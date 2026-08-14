import { describe, expect, test, vi } from "vitest";
import { buildSymplaSlackPayload, sendSymplaSlackAlert, symplaAlertDedupeKey } from "@/lib/integrations/slack-alerts";

const input = { integrationId: "11111111-1111-1111-1111-111111111111", syncRunId: "22222222-2222-2222-2222-222222222222", deadLetterId: "33333333-3333-3333-3333-333333333333", errorCode: "sympla_sync_failed" };

describe("alerta Slack da Sympla", () => {
  test("gera a mesma chave para a mesma integração e categoria de falha", () => {
    expect(symplaAlertDedupeKey(input, "2026-08-14T12")).toBe(symplaAlertDedupeKey({ integrationId: input.integrationId, errorCode: input.errorCode }, "2026-08-14T12"));
    expect(symplaAlertDedupeKey(input, "2026-08-14T12")).not.toBe(symplaAlertDedupeKey(input, "2026-08-14T13"));
  });

  test("não inclui segredo, payload externo ou dados de participantes na mensagem", () => {
    const payload = JSON.stringify(buildSymplaSlackPayload(input));
    expect(payload).toContain(input.syncRunId);
    expect(payload).not.toContain("s_token");
    expect(payload).not.toContain("participant");
  });

  test("entrega o alerta com POST JSON quando o webhook responde sucesso", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));
    await expect(sendSymplaSlackAlert(input, fetcher, "https://hooks.slack.com/services/test")).resolves.toEqual({ status: "sent" });
    expect(fetcher).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ method: "POST", headers: { "content-type": "application/json" } }));
  });

  test("não lança e registra falha quando o Slack está indisponível", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 503 }));
    await expect(sendSymplaSlackAlert(input, fetcher, "https://hooks.slack.com/services/test")).resolves.toEqual({ status: "failed", error: "Slack respondeu HTTP 503." });
  });

  test("não tenta entrega quando o webhook não está configurado", async () => {
    const fetcher = vi.fn();
    await expect(sendSymplaSlackAlert(input, fetcher, null)).resolves.toEqual({ status: "skipped", error: "Webhook Slack não configurado." });
    expect(fetcher).not.toHaveBeenCalled();
  });

  test("normaliza falha de rede sem vazar a causa interna", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("network detail"));
    await expect(sendSymplaSlackAlert(input, fetcher, "https://hooks.slack.com/services/test")).resolves.toEqual({ status: "failed", error: "Não foi possível entregar o alerta ao Slack." });
  });
});
