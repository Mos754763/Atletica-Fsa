import { createHash } from "node:crypto";
import { env } from "@/lib/env";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SymplaAlertInput = {
  integrationId: string;
  syncRunId: string;
  deadLetterId: string;
  errorCode: string;
};

export type SymplaHealthAlertInput = {
  integrationId: string;
  alertType: "sympla_health_peak" | "sympla_health_recovered";
  severity: "warning" | "critical" | "healthy";
  lines: string[];
};

export function symplaAlertDedupeKey(input: Pick<SymplaAlertInput, "integrationId" | "errorCode">, hourBucket = new Date().toISOString().slice(0, 13)) {
  return createHash("sha256").update(`sympla:${input.integrationId}:${input.errorCode}:${hourBucket}`).digest("hex");
}

export function buildSymplaSlackPayload(input: SymplaAlertInput) {
  return {
    text: "ATLETICA FSA · Falha de sincronização Sympla",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          "*ATLETICA FSA · Falha de sincronização Sympla*",
          `*Código:* \`${input.errorCode}\``,
          `*Execução:* \`${input.syncRunId}\``,
          `*Ocorrência:* \`${input.deadLetterId}\``,
          "*Ação:* revisar ERP → Integrações → Sympla e reprocessar a ocorrência após corrigir a causa.",
        ].join("\n"),
      },
    }],
  };
}

export async function sendSymplaSlackAlert(input: SymplaAlertInput, fetcher: FetchLike = fetch, webhookUrl?: string | null) {
  const configuredWebhookUrl = webhookUrl === undefined ? env.slackSymplaAlertWebhookUrl : webhookUrl;
  if (!configuredWebhookUrl) return { status: "skipped" as const, error: "Webhook Slack não configurado." };

  try {
    const response = await fetcher(configuredWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSymplaSlackPayload(input)),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: "failed" as const, error: `Slack respondeu HTTP ${response.status}.` };
    return { status: "sent" as const };
  } catch {
    return { status: "failed" as const, error: "Não foi possível entregar o alerta ao Slack." };
  }
}

export function buildSymplaHealthSlackPayload(input: SymplaHealthAlertInput) {
  const isRecovery = input.alertType === "sympla_health_recovered";
  return {
    text: isRecovery ? "ATLETICA FSA · Integração Sympla recuperada" : "ATLETICA FSA · Pico de falhas na Sympla",
    blocks: [{
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          isRecovery ? "*ATLETICA FSA · Integração Sympla recuperada*" : `*ATLETICA FSA · Saúde Sympla: ${input.severity}*`,
          ...input.lines,
          isRecovery ? "*Ação:* monitorar normalmente; o incidente anterior foi encerrado." : "*Ação:* revisar ERP → Integrações → Sympla e as dead letters abertas.",
        ].join("\n"),
      },
    }],
  };
}

export async function sendSymplaHealthSlackAlert(input: SymplaHealthAlertInput, fetcher: FetchLike = fetch, webhookUrl?: string | null) {
  const configuredWebhookUrl = webhookUrl === undefined ? env.slackSymplaAlertWebhookUrl : webhookUrl;
  if (!configuredWebhookUrl) return { status: "skipped" as const, error: "Webhook Slack não configurado." };
  try {
    const response = await fetcher(configuredWebhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSymplaHealthSlackPayload(input)),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: "failed" as const, error: `Slack respondeu HTTP ${response.status}.` };
    return { status: "sent" as const };
  } catch {
    return { status: "failed" as const, error: "Não foi possível entregar o alerta ao Slack." };
  }
}
