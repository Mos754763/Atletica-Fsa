import { describe, expect, it } from "vitest";
import { canPerformSectorAction } from "./permissions";

describe("permissões por setor", () => {
  it("dá autonomia completa ao presidente e ao diretor apenas pela condição organizacional", () => {
    expect(canPerformSectorAction({ isPresident: true, membershipRole: null, hasExplicitGrant: false, action: "apagar" })).toBe(true);
    expect(canPerformSectorAction({ isPresident: false, membershipRole: "diretor", hasExplicitGrant: false, action: "editar" })).toBe(true);
  });

  it("mantém visualizador em leitura sem concessão adicional", () => {
    expect(canPerformSectorAction({ isPresident: false, membershipRole: "visualizador", hasExplicitGrant: false, action: "ver" })).toBe(true);
    expect(canPerformSectorAction({ isPresident: false, membershipRole: "visualizador", hasExplicitGrant: false, action: "criar" })).toBe(false);
  });

  it("permite ampliar uma ação específica sem transformar o membro em diretor", () => {
    expect(canPerformSectorAction({ isPresident: false, membershipRole: "membro", hasExplicitGrant: true, action: "editar" })).toBe(true);
  });
});
