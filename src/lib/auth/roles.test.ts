import { describe, expect, it } from "vitest";
import { canAccessRole, roleLabel } from "./roles";

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
});
