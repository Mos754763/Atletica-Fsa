import { describe, expect, it } from "vitest";
import { resolveThemePreference } from "@/lib/theme";

describe("resolveThemePreference", () => {
  it("prioriza uma preferência persistida válida", () => {
    expect(resolveThemePreference("dark", false)).toBe("dark");
    expect(resolveThemePreference("light", true)).toBe("light");
  });

  it("prioriza o sistema escuro e usa escuro como padrão seguro quando não há escolha", () => {
    expect(resolveThemePreference(null, true)).toBe("dark");
    expect(resolveThemePreference(undefined, false)).toBe("dark");
  });

  it("ignora valores persistidos inválidos", () => {
    expect(resolveThemePreference("solarized", true)).toBe("dark");
  });
});
