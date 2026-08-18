import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "@/lib/theme";

describe("resolveThemePreference", () => {
  it("prioriza uma preferência persistida válida", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("usa o modo claro como padrão quando não há escolha persistida", () => {
    expect(resolveThemePreference(null, true)).toBe("light");
    expect(resolveThemePreference(undefined, false)).toBe("light");
  });

  it("ignora valores persistidos inválidos", () => {
    expect(resolveThemePreference("solarized", true)).toBe("light");
  });
});
