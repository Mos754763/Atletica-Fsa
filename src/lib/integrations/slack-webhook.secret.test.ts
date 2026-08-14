import { describe, expect, it } from "vitest";

const webhookUrl = process.env.SLACK_SYMPLA_ALERT_WEBHOOK_URL;

describe("Slack incoming webhook credential", () => {
  it.skipIf(!webhookUrl)("aceita uma mensagem de validação do backend", async () => {
    const response = await fetch(webhookUrl!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: "ATLETICA FSA: credencial de alerta Sympla validada pelo servidor.",
      }),
      signal: AbortSignal.timeout(8_000),
    });

    expect(response.ok).toBe(true);
  });
});
