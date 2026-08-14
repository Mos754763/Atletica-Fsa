import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "@/lib/theme";

describe("resolveThemePreference", () => {
  it("prioriza uma preferência persistida válida", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("usa a preferência do sistema quando não existe escolha persistida", () => {
    expect(resolveThemePreference(null, true)).toBe("dark");
    expect(resolveThemePreference(undefined, false)).toBe("light");
  });

  it("ignora valores persistidos inválidos", () => {
    expect(resolveThemePreference("solarized", true)).toBe("dark");
  });
});
