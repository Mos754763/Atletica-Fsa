import { describe, expect, it } from "vitest";
import { assertMemberRoleChange, manageableRoles, roleDescription } from "./members";

describe("gestão administrativa de membros", () => {
  it("expõe todos os papéis operacionais com suas descrições", () => {
    expect(manageableRoles.map((role) => role.value)).toEqual(["admin", "caixa", "cozinha", "cliente"]);
    expect(manageableRoles.find((role) => role.value === "cozinha")?.label).toBe("Backoffice");
    expect(roleDescription("cozinha")).toContain("ODS");
  });

  it("impede que o último administrador seja rebaixado", () => {
    expect(() => assertMemberRoleChange({ actorId: "owner", targetId: "other", currentRole: "admin", nextRole: "cliente", adminCount: 1 })).toThrow("ao menos um administrador");
  });

  it("impede que o administrador remova a própria permissão por acidente", () => {
    expect(() => assertMemberRoleChange({ actorId: "owner", targetId: "owner", currentRole: "admin", nextRole: "cliente", adminCount: 2 })).toThrow("próprio acesso");
  });

  it("permite alterações seguras de papel por outro administrador", () => {
    expect(() => assertMemberRoleChange({ actorId: "owner", targetId: "member", currentRole: "cliente", nextRole: "caixa", adminCount: 1 })).not.toThrow();
  });
});
