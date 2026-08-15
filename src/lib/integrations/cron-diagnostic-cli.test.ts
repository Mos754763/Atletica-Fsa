import { describe, expect, it } from "vitest";
import { assessCronHeartbeats, diagnosticExitCode } from "../../../scripts/diagnose-cron-health.mjs";

const now = new Date("2026-08-15T15:00:00.000Z");

describe("diagnóstico manual de cron", () => {
  it("classifica heartbeats atuais como saudáveis", () => {
    const result = assessCronHeartbeats([
      { route_path: "/api/cron/event-reminders", status: "succeeded", duration_ms: 120, detail: null, executed_at: "2026-08-15T14:00:00.000Z" },
      { route_path: "/api/cron/sympla-sync", status: "succeeded", duration_ms: 220, detail: null, executed_at: "2026-08-15T14:05:00.000Z" },
      { route_path: "/api/cron/integration-health", status: "succeeded", duration_ms: 300, detail: null, executed_at: "2026-08-11T18:00:00.000Z" },
    ], now);

    expect(result.map((item) => item.state)).toEqual(["healthy", "healthy", "healthy"]);
    expect(diagnosticExitCode(result)).toBe(0);
  });

  it("falha para job diário atrasado ou com última execução falha", () => {
    const result = assessCronHeartbeats([
      { route_path: "/api/cron/event-reminders", status: "succeeded", duration_ms: 120, detail: null, executed_at: "2026-08-14T11:00:00.000Z" },
      { route_path: "/api/cron/sympla-sync", status: "failed", duration_ms: 220, detail: "Falha controlada", executed_at: "2026-08-15T14:05:00.000Z" },
    ], now);

    expect(result.find((item) => item.routePath === "/api/cron/event-reminders")?.state).toBe("stale");
    expect(result.find((item) => item.routePath === "/api/cron/sympla-sync")?.state).toBe("failed");
    expect(diagnosticExitCode(result, true)).toBe(2);
  });

  it("distingue a ausência esperada de heartbeat da primeira execução", () => {
    const result = assessCronHeartbeats([], now);

    expect(result.map((item) => item.state)).toEqual(["missing", "missing", "missing"]);
    expect(diagnosticExitCode(result)).toBe(1);
    expect(diagnosticExitCode(result, true)).toBe(0);
  });
});
