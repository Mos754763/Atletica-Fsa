import { describe, expect, it } from "vitest";
import { DEFAULT_THEME, resolveThemePreference } from "@/lib/theme";

describe("resolveThemePreference", () => {
  it("prioriza uma preferência persistida válida", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("usa a preferência do sistema quando não há escolha persistida", () => {
    expect(DEFAULT_THEME).toBe("light");
    expect(resolveThemePreference(null, true)).toBe("dark");
    expect(resolveThemePreference(undefined, false)).toBe(DEFAULT_THEME);
  });

  it("ignora valores persistidos inválidos", () => {
    expect(resolveThemePreference("solarized", true)).toBe("dark");
    expect(resolveThemePreference("solarized", false)).toBe(DEFAULT_THEME);
  });
});
