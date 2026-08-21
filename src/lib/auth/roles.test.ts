import { describe, expect, it } from "vitest";
import { canAccessRole, canAccessRoles, normalizeRoles, roleLabel, roleLabels } from "./roles";

describe("controle de acesso por papel", () => {
  it("restringe áreas operacionais aos papéis permitidos", () => {
    expect(canAccessRole("admin", ["admin"])).toBe(true);
    expect(canAccessRole("cozinha", ["admin", "cozinha"])).toBe(true);
    expect(canAccessRole("caixa", ["admin", "cozinha"])).toBe(false);
    expect(canAccessRole("cliente", ["admin", "caixa"])).toBe(false);
    expect(canAccessRole(null, ["admin"])).toBe(false);
  });

  it("traduz os papéis para rótulos de interface", () => {
    expect(roleLabel("caixa")).toBe("Caixa");
    expect(roleLabel("cliente")).toBe("Cliente");
  });

  it("normaliza e acumula as atribuições sem duplicá-las", () => {
    expect(normalizeRoles(["caixa", "cliente", "caixa"], "cliente")).toEqual(["caixa", "cliente"]);
    expect(roleLabels(["admin", "caixa"])).toEqual(["Administração", "Caixa"]);
  });

  it("autoriza quando ao menos uma atribuição atende à permissão e mantém o menor privilégio", () => {
    expect(canAccessRoles(["cliente", "caixa"], ["caixa"])).toBe(true);
    expect(canAccessRoles(["cliente", "caixa"], ["admin"])).toBe(false);
    expect(canAccessRoles([], ["admin", "caixa"])).toBe(false);
  });
});
