import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("member interest abuse metrics migration", () => {
  it("converte explicitamente a série diária para date antes de retornar o histórico", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260819211500_fix_member_interest_abuse_daily_metrics.sql"), "utf8");

    expect(migration).toContain("days.metric_day::date");
    expect(migration).toContain("returns table(");
    expect(migration).toContain("metric_day date");
    expect(migration).toContain("if not public.is_president()");
  });
});
