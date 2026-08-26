import { describe, expect, it } from "vitest";
import { assertMemberRolesChange, manageableRoles, roleDescription, rolesDescription } from "./members";

describe("gestão administrativa de membros", () => {
  it("expõe todos os papéis operacionais com suas descrições", () => {
    expect(manageableRoles.map((role) => role.value)).toEqual(["admin", "caixa", "backoffice", "cliente"]);
    expect(manageableRoles.find((role) => role.value === "backoffice")?.label).toBe("Backoffice");
    expect(roleDescription("backoffice")).toContain("ODS");
  });

  it("impede que o último administrador seja rebaixado", () => {
    expect(() => assertMemberRolesChange({ actorId: "owner", targetId: "other", currentRoles: ["admin", "caixa"], nextRoles: ["caixa"], adminCount: 1 })).toThrow("ao menos um administrador");
  });

  it("impede que o administrador remova a própria permissão por acidente", () => {
    expect(() => assertMemberRolesChange({ actorId: "owner", targetId: "owner", currentRoles: ["admin"], nextRoles: ["cliente"], adminCount: 2 })).toThrow("próprio acesso");
  });

  it("permite adicionar atribuições sem remover o acesso existente", () => {
    expect(() => assertMemberRolesChange({ actorId: "owner", targetId: "member", currentRoles: ["cliente"], nextRoles: ["cliente", "caixa"], adminCount: 1 })).not.toThrow();
    expect(rolesDescription(["cliente", "caixa"])).toContain("Catálogo");
  });

  it("impede salvar um conjunto vazio de atribuições", () => {
    expect(() => assertMemberRolesChange({ actorId: "owner", targetId: "member", currentRoles: ["cliente"], nextRoles: [], adminCount: 1 })).toThrow("ao menos uma atribuição");
  });
});
