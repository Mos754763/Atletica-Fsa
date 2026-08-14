import { describe, expect, it } from "vitest";
import { classifyCronRouteHealth, classifyIntegrationHealth, shouldSendRecovery } from "./integration-health";

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

  it("detecta cron ausente, falho ou atrasado", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(classifyCronRouteHealth(null, 20, now)).toBe("critical");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "failed", executedAt: "2026-08-17T11:59:00.000Z" }, 20, now)).toBe("critical");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-17T11:35:00.000Z" }, 20, now)).toBe("critical");
  });

  it("aceita cron recente e alerta antes do atraso máximo", () => {
    const now = new Date("2026-08-17T12:00:00.000Z");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-17T11:45:00.000Z" }, 20, now)).toBe("healthy");
    expect(classifyCronRouteHealth({ routePath: "/api/cron/sympla-sync", status: "succeeded", executedAt: "2026-08-17T11:44:00.000Z" }, 20, now)).toBe("warning");
  });
});
