import { describe, expect, it } from "vitest";
import { brlInputToCents, centsToBrlInput } from "./money";

describe("conversão monetária em reais", () => {
  it("converte valores digitados em formato brasileiro para centavos", () => {
    expect(brlInputToCents("69,90")).toBe(6990);
    expect(brlInputToCents("R$ 7,00")).toBe(700);
    expect(brlInputToCents("149.90")).toBe(14990);
  });

  it("preserva a representação em reais para os formulários", () => {
    expect(centsToBrlInput(6990)).toBe("69,90");
  });
});
