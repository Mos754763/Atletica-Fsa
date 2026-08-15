import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { classifyCronRouteHealth, classifyIntegrationHealth, formatHealthMetrics, healthAlertDedupeKey, shouldSendRecovery, type CronRouteHeartbeat, type IntegrationHealthMetrics, type IntegrationHealthStatus } from "@/lib/integrations/integration-health";
import { sendSymplaHealthSlackAlert } from "@/lib/integrations/slack-alerts";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HealthRow = IntegrationHealthMetrics & { integration_id: string; provider: string };
type HeartbeatRow = { route_path: string; status: "succeeded" | "failed"; executed_at: string };

const CRON_ROUTE_LIMITS = [
  { path: "/api/cron/sympla-sync", maxAgeMinutes: 1_560 },
  { path: "/api/cron/event-reminders", maxAgeMinutes: 1_560 },
  // A rota roda semanalmente. A janela estendida impede que uma execução
  // pontual seja classificada como warning pela pré-alerta genérica de 75%.
  { path: "/api/cron/integration-health", maxAgeMinutes: 13_500 },
] as const;

async function deliverHealthAlert(input: {
  integrationId: string;
  alertType: "sympla_health_peak" | "sympla_health_recovered";
  severity: "warning" | "critical" | "healthy";
  incidentStartedAt: string;
  lines: string[];
}) {
  const supabase = createServiceClient();
  const { data: claim } = await supabase.rpc("claim_sympla_alert", {
    p_integration_id: input.integrationId,
    p_dead_letter_id: null,
    p_dedupe_key: healthAlertDedupeKey(input.integrationId, input.alertType, input.incidentStartedAt),
    p_alert_type: input.alertType,
  }).maybeSingle<{ alert_id: string; claimed: boolean }>();
  if (!claim?.claimed) return "duplicate";

  const delivery = await sendSymplaHealthSlackAlert({ integrationId: input.integrationId, alertType: input.alertType, severity: input.severity, lines: input.lines });
  await supabase.rpc("finish_sympla_alert", { p_alert_id: claim.alert_id, p_status: delivery.status, p_error: "error" in delivery ? delivery.error : null });
  await supabase.from("crm_activity_logs").insert({
    actor_kind: "integration", action: "sympla.health_alert", outcome: delivery.status === "sent" ? "succeeded" : delivery.status === "skipped" ? "ignored" : "failed",
    resource_type: "event_integration", resource_id: input.integrationId, source: "scheduled", summary: `Alerta de saúde Sympla: ${input.alertType}`,
    metadata_json: { alert_type: input.alertType, alert_status: delivery.status, severity: input.severity },
  });
  return delivery.status;
}

export async function GET(request: Request) {
  if (!env.cronSecret || request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const startedAt = Date.now();
  const supabase = createServiceClient();
  try {
    const { data, error } = await supabase.rpc("get_sympla_integration_health");
    if (error) throw new Error("Não foi possível calcular a saúde das integrações.");
    const { data: heartbeatRows, error: heartbeatError } = await supabase
      .from("scheduled_route_heartbeats")
      .select("route_path,status,executed_at")
      .in("route_path", CRON_ROUTE_LIMITS.map((route) => route.path))
      .order("executed_at", { ascending: false });
    if (heartbeatError) throw new Error("Não foi possível verificar os batimentos das rotas cron.");
    const latestHeartbeats = new Map<string, CronRouteHeartbeat>();
    for (const heartbeat of (heartbeatRows ?? []) as HeartbeatRow[]) {
      if (!latestHeartbeats.has(heartbeat.route_path)) {
        latestHeartbeats.set(heartbeat.route_path, { routePath: heartbeat.route_path, status: heartbeat.status, executedAt: heartbeat.executed_at });
      }
    }
    const routeResults = CRON_ROUTE_LIMITS.map((route) => ({
      ...route,
      status: classifyCronRouteHealth(latestHeartbeats.get(route.path) ?? null, route.maxAgeMinutes),
      lastExecutedAt: latestHeartbeats.get(route.path)?.executedAt ?? null,
    }));
    const routeStatus: IntegrationHealthStatus = routeResults.some((route) => route.status === "critical")
      ? "critical"
      : routeResults.some((route) => route.status === "warning") ? "warning" : "healthy";
    const results = [];
    for (const row of (data ?? []) as HealthRow[]) {
      const { data: previous } = await supabase.from("integration_health_states").select("status,incident_started_at").eq("integration_id", row.integration_id).eq("scope", "sync").maybeSingle<{ status: IntegrationHealthStatus; incident_started_at: string | null }>();
      const status = classifyIntegrationHealth(row);
      const now = new Date().toISOString();
      const incidentStartedAt = status === "healthy" ? previous?.incident_started_at ?? now : previous?.status && previous.status !== "healthy" && previous.incident_started_at ? previous.incident_started_at : now;
      await supabase.from("integration_health_states").upsert({
        integration_id: row.integration_id, scope: "sync", status, incident_started_at: status === "healthy" ? null : incidentStartedAt,
        last_checked_at: now, last_recovered_at: shouldSendRecovery(previous?.status, status) ? now : null, metrics: row,
      }, { onConflict: "integration_id,scope" });

      let alert = "none";
      if (status !== "healthy" && previous?.status !== status) {
        alert = await deliverHealthAlert({ integrationId: row.integration_id, alertType: "sympla_health_peak", severity: status, incidentStartedAt, lines: formatHealthMetrics(row) });
      } else if (shouldSendRecovery(previous?.status, status)) {
        alert = await deliverHealthAlert({ integrationId: row.integration_id, alertType: "sympla_health_recovered", severity: "healthy", incidentStartedAt: previous?.incident_started_at ?? now, lines: ["A verificação semanal encontrou a integração novamente saudável.", ...formatHealthMetrics(row)] });
      }
      results.push({ provider: row.provider, status, alert });

      const { data: previousRoutes } = await supabase.from("integration_health_states").select("status,incident_started_at").eq("integration_id", row.integration_id).eq("scope", "cron_routes").maybeSingle<{ status: IntegrationHealthStatus; incident_started_at: string | null }>();
      const routeNow = new Date().toISOString();
      const routeIncidentStartedAt = routeStatus === "healthy" ? previousRoutes?.incident_started_at ?? routeNow : previousRoutes?.status && previousRoutes.status !== "healthy" && previousRoutes.incident_started_at ? previousRoutes.incident_started_at : routeNow;
      await supabase.from("integration_health_states").upsert({
        integration_id: row.integration_id, scope: "cron_routes", status: routeStatus, incident_started_at: routeStatus === "healthy" ? null : routeIncidentStartedAt,
        last_checked_at: routeNow, last_recovered_at: shouldSendRecovery(previousRoutes?.status, routeStatus) ? routeNow : null, metrics: { routes: routeResults },
      }, { onConflict: "integration_id,scope" });
      let routeAlert = "none";
      if (routeStatus !== "healthy" && previousRoutes?.status !== routeStatus) {
        routeAlert = await deliverHealthAlert({ integrationId: row.integration_id, alertType: "sympla_health_peak", severity: routeStatus, incidentStartedAt: `${routeIncidentStartedAt}:cron-routes`, lines: routeResults.map((route) => `${route.path}: ${route.status}${route.lastExecutedAt ? ` · última execução ${route.lastExecutedAt}` : " · sem batimento"}`) });
      } else if (shouldSendRecovery(previousRoutes?.status, routeStatus)) {
        routeAlert = await deliverHealthAlert({ integrationId: row.integration_id, alertType: "sympla_health_recovered", severity: "healthy", incidentStartedAt: `${previousRoutes?.incident_started_at ?? routeNow}:cron-routes`, lines: ["As rotas cron monitoradas voltaram a registrar batimentos dentro da cadência esperada.", ...routeResults.map((route) => `${route.path}: ${route.status}`)] });
      }
      results[results.length - 1] = { ...results[results.length - 1], cronRoutes: { status: routeStatus, alert: routeAlert, routes: routeResults } };
    }
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/integration-health", status: "succeeded", duration_ms: Date.now() - startedAt });
    return NextResponse.json({ ok: true, cadence: "weekly", results }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 600) : "Falha desconhecida no health check.";
    await supabase.from("scheduled_route_heartbeats").insert({ route_path: "/api/cron/integration-health", status: "failed", duration_ms: Date.now() - startedAt, detail });
    return NextResponse.json({ error: "A verificação semanal de integrações falhou; consulte os logs." }, { status: 503 });
  }
}
