import { createHash } from "node:crypto";

export type IntegrationHealthMetrics = {
  open_dead_letters: number;
  new_dead_letters_15m: number;
  oldest_open_minutes: number;
  failed_runs_1h: number;
  total_runs_1h: number;
};

export type IntegrationHealthStatus = "healthy" | "warning" | "critical";

export type CronRouteHeartbeat = {
  routePath: string;
  status: "succeeded" | "failed";
  executedAt: string;
};

export function classifyIntegrationHealth(metrics: IntegrationHealthMetrics): IntegrationHealthStatus {
  const failureRate = metrics.total_runs_1h > 0 ? metrics.failed_runs_1h / metrics.total_runs_1h : 0;
  if (metrics.open_dead_letters >= 10 || metrics.new_dead_letters_15m >= 6 || metrics.oldest_open_minutes > 60 || failureRate > 0.25) return "critical";
  if (metrics.open_dead_letters >= 3 || metrics.new_dead_letters_15m >= 3 || metrics.oldest_open_minutes > 30 || failureRate > 0.1) return "warning";
  return "healthy";
}

export function healthAlertDedupeKey(integrationId: string, alertType: "sympla_health_peak" | "sympla_health_recovered", incidentStartedAt: string) {
  return createHash("sha256").update(`sympla-health:${integrationId}:${alertType}:${incidentStartedAt}`).digest("hex");
}

export function shouldSendRecovery(previousStatus: IntegrationHealthStatus | null | undefined, currentStatus: IntegrationHealthStatus) {
  return currentStatus === "healthy" && Boolean(previousStatus && previousStatus !== "healthy");
}

export function classifyCronRouteHealth(heartbeat: CronRouteHeartbeat | null, maxAgeMinutes: number, now = new Date()): IntegrationHealthStatus {
  if (!heartbeat || heartbeat.status === "failed") return "critical";
  const ageMinutes = (now.getTime() - new Date(heartbeat.executedAt).getTime()) / 60_000;
  if (!Number.isFinite(ageMinutes) || ageMinutes > maxAgeMinutes) return "critical";
  if (ageMinutes > maxAgeMinutes * 0.75) return "warning";
  return "healthy";
}

export function formatHealthMetrics(metrics: IntegrationHealthMetrics) {
  const failureRate = metrics.total_runs_1h > 0 ? Math.round((metrics.failed_runs_1h / metrics.total_runs_1h) * 100) : 0;
  return [
    `Dead letters abertas: ${metrics.open_dead_letters}`,
    `Novas em 15 min: ${metrics.new_dead_letters_15m}`,
    `Maior idade: ${Math.round(metrics.oldest_open_minutes)} min`,
    `Falhas em 1 h: ${metrics.failed_runs_1h}/${metrics.total_runs_1h} (${failureRate}%)`,
  ];
}
