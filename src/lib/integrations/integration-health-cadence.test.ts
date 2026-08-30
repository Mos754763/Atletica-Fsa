import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("cadência do health check", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/cron/integration-health/route.ts"), "utf8");
  const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  const runbook = readFileSync(path.join(process.cwd(), "docs/runbooks/integration-health-cadence.md"), "utf8");

  it("mantém fallback diário compatível com Vercel Hobby", () => {
    expect(vercel.crons.find((cron) => cron.path === "/api/cron/integration-health")?.schedule).toBe("0 18 * * *");
    expect(vercel.crons.every((cron) => !cron.schedule.includes("*/"))).toBe(true);
  });

  it("define SLO de duas horas e evita texto semanal obsoleto", () => {
    expect(route).toContain("maxAgeMinutes: 180");
    expect(route).toContain('cadence: "every_2_hours_with_daily_fallback"');
    expect(route).not.toContain("verificação semanal");
    expect(runbook).toContain("0 */2 * * *");
    expect(runbook).toContain("≤ 2 horas");
  });
});
