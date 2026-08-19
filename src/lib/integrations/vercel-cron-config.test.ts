import vercelConfig from "../../../vercel.json";
import { describe, expect, it } from "vitest";

describe("configuração de cron da Vercel", () => {
  it("mantém todas as rotas em uma cadência compatível com o plano Hobby", () => {
    expect(vercelConfig.crons).toEqual([
      { path: "/api/cron/event-reminders", schedule: "0 13 * * *" },
      { path: "/api/cron/sympla-sync", schedule: "0 14 * * *" },
      { path: "/api/cron/member-interest-retention", schedule: "0 15 * * *" },
      { path: "/api/cron/integration-health", schedule: "0 18 * * 1" },
    ]);
  });
});
