import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("cadência do health check", () => {
  const route = readFileSync(path.join(process.cwd(), "src/app/api/cron/integration-health/route.ts"), "utf8");
  const vercel = JSON.parse(readFileSync(path.join(process.cwd(), "vercel.json"), "utf8")) as { crons: Array<{ path: string; schedule: string }> };
  const runbook = readFileSync(path.join(process.cwd(), "docs/runbooks/integration-health-cadence.md"), "utf8");

  it("mantém a Vercel diária como a única agenda ativa", () => {
    expect(vercel.crons.find((cron) => cron.path === "/api/cron/integration-health")?.schedule).toBe("0 18 * * *");
    expect(vercel.crons.every((cron) => !cron.schedule.includes("*/"))).toBe(true);
  });

  it("alinha o limiar e a resposta à execução diária enquanto o agendador de duas horas está desativado", () => {
    expect(route).toContain("maxAgeMinutes: 2_160");
    expect(route).toContain('cadence: "daily"');
    expect(route).not.toContain("verificação semanal");
    expect(runbook).toContain("0 18 * * *");
    expect(runbook).toContain("36 horas");
    expect(runbook).not.toContain("0 */2 * * *");
    expect(runbook).not.toContain("Supabase Cron");
  });
});
