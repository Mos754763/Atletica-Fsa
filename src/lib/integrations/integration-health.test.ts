import { describe, expect, it } from "vitest";
import { classifyCronRouteHealth, classifyIntegrationHealth, latestCronRouteHeartbeatsBefore, shouldSendRecovery } from "./integration-health";

describe("classifyIntegrationHealth", () => {
  it("classifica estado saudável sem backlog ou falhas", () => {
    expect(classifyIntegrationHealth({ open_dead_letters: 0, new_dead_letters_15m: 0, oldest_open_minutes: 0, failed_runs_1h: 0, total_runs_1h: 4 })).toBe("healthy");
  });

  it("classifica aviso para pico moderado de incidentes", () => {
    expect(classifyIntegrationHealth({ open_dead_letters: 3, new_dead_letters_15m: 1, oldest_open_minutes: 5, failed_runs_1h: 0, total_runs_1h: 4 })).toBe("warning");
  });

  it("classifica crítico para backlog elevado ou taxa de falha alta", () => {
    expect(classifyIntegrationHealth({ open_dead_letters: 1, new_dead_letters_15m: 1, oldest_open_minutes: 5, failed_runs_1h: 2, total_runs_1h: 4 })).toBe("critical");
  });

  it("notifica recuperação somente após estado não saudável", () => {
    expect(shouldSendRecovery("critical", "healthy")).toBe(true);
    expect(shouldSendRecovery("healthy", "healthy")).toBe(false);
  });

  it("detecta cron diário ausente, falho ou atrasado", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(classifyCronRouteHealth(null, 1_560, now)).toBe("critical");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "failed", executedAt: "2026-08-17T11:59:00.000Z" }, 1_560, now)).toBe("critical");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-16T09:59:00.000Z" }, 1_560, now)).toBe("critical");
  });

  it("aceita cron diário recente e alerta antes do atraso máximo", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-17T00:00:00.000Z" }, 1_560, now)).toBe("healthy");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-16T15:00:00.000Z" }, 1_560, now)).toBe("warning");
  });

  it("mantém o heartbeat semanal saudável no horário previsto, alerta no atraso e detecta ausência prolongada", () => {
    const now = new Date("2026-08-18T18:30:00.000Z");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-11T18:00:00.000Z" }, 13_500, now)).toBe("healthy");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-11T16:00:00.000Z" }, 13_500, now)).toBe("warning");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-08T18:00:00.000Z" }, 13_500, now)).toBe("critical");
  });

  it("usa apenas o último heartbeat anterior ao início da própria avaliação", () => {
    const startedAt = new Date("2026-08-20T18:00:00.000Z");
    const latest = latestCronRouteHeartbeatsBefore([
      { routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-13T18:00:00.000Z" },
      { routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-20T18:00:00.000Z" },
      { routePath: "/api/cron/integration-health", status: "failed", executedAt: "2026-08-20T18:00:01.000Z" },
      { routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-20T17:00:00.000Z" },
    ], startedAt);

    expect(latest.get("/api/cron/integration-health")).toEqual({ routePath: "/api/cron/integration-health", status: "succeeded", executedAt: "2026-08-13T18:00:00.000Z" });
    expect(latest.get("/api/cron/sympla-sync")).toEqual({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-20T17:00:00.000Z" });
  });
});
