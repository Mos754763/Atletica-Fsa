import { describe, expect, it } from "vitest";
import { averageMinutesBetween, formatMinutes, resolveAnalyticsPeriod, revenueByDay } from "./analytics";

describe("indicadores operacionais", () => {
  it("aceita apenas as janelas disponíveis", () => {
    expect(resolveAnalyticsPeriod("7")).toBe(7);
    expect(resolveAnalyticsPeriod("999")).toBe(30);
  });

  it("calcula o SLA médio somente com pedidos que chegaram ao pronto", () => {
    const minutes = averageMinutesBetween([
      { status: "pronto", total_cents: 1000, created_at: "2026-01-01T10:00:00Z", paid_at: "2026-01-01T10:00:00Z", ready_at: "2026-01-01T10:20:00Z" },
      { status: "pronto", total_cents: 2000, created_at: "2026-01-01T10:00:00Z", paid_at: "2026-01-01T10:00:00Z", ready_at: "2026-01-01T10:40:00Z" },
      { status: "em_preparo", total_cents: 2000, created_at: "2026-01-01T10:00:00Z", paid_at: "2026-01-01T10:00:00Z", ready_at: null },
    ], "paid_at", "ready_at");
    expect(minutes).toBe(30);
    expect(formatMinutes(minutes)).toBe("30 min");
  });

  it("preenche a série temporal com dados reais e dias vazios", () => {
    const result = revenueByDay([{ amount_cents: 4500, approved_at: "2026-08-13T12:00:00Z" }], 2, new Date("2026-08-13T18:00:00Z"));
    expect(result).toHaveLength(2);
    expect(result[1].cents).toBe(4500);
  });
});
