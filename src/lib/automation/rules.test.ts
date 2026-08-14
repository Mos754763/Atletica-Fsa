import { describe, expect, it } from "vitest";
import { matchesAutomationCondition } from "./rules";

describe("matchesAutomationCondition", () => {
  it("permite regra sem condição", () => expect(matchesAutomationCondition({}, { status: "pago" })).toBe(true));
  it("compara a chave solicitada no contexto", () => expect(matchesAutomationCondition({ field: "status", equals: "pago" }, { status: "pago" })).toBe(true));
  it("bloqueia quando o valor não coincide", () => expect(matchesAutomationCondition({ field: "status", equals: "pronto" }, { status: "pago" })).toBe(false));
});
