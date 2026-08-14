import { describe, expect, it } from "vitest";
import { activityActionLabel, activityOutcomeLabel, getExpectationState } from "./activity";

describe("getExpectationState", () => {
  const now = new Date("2026-08-14T15:00:00.000Z");

  it("prioriza conclusão e cancelamento sobre o prazo", () => {
    expect(getExpectationState({ completed_at: "2026-08-14T14:00:00.000Z", cancelled_at: null, due_at: "2026-08-13T14:00:00.000Z" }, now)).toBe("concluida");
    expect(getExpectationState({ completed_at: null, cancelled_at: "2026-08-14T14:00:00.000Z", due_at: "2026-08-13T14:00:00.000Z" }, now)).toBe("cancelada");
  });

  it("classifica apenas obrigações atribuídas e não concluídas como em atraso", () => {
    expect(getExpectationState({ completed_at: null, cancelled_at: null, due_at: "2026-08-13T14:00:00.000Z" }, now)).toBe("em_atraso");
    expect(getExpectationState({ completed_at: null, cancelled_at: null, due_at: "2026-08-15T14:00:00.000Z" }, now)).toBe("em_aberto");
  });
});

describe("rótulos da timeline", () => {
  it("traduz ações conhecidas e mantém o fallback legível", () => {
    expect(activityActionLabel("authorization.access_blocked")).toBe("Acesso bloqueado");
    expect(activityActionLabel("external_sync.failed")).toBe("external sync · failed");
    expect(activityOutcomeLabel("blocked")).toBe("Bloqueada");
  });
});
