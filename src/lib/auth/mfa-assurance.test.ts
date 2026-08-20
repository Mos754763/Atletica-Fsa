import { describe, expect, it } from "vitest";
import { buildMfaRedirectPath, formatMfaFactorType, requiresMfaChallenge } from "./mfa-assurance";

describe("assurance de MFA", () => {
  it("exige desafio quando uma sessão AAL1 possui um fator verificado", () => {
    expect(requiresMfaChallenge("aal1", "aal2")).toBe(true);
  });

  it("não exige novo desafio depois que a sessão já atingiu AAL2", () => {
    expect(requiresMfaChallenge("aal2", "aal2")).toBe(false);
  });

  it("não exige MFA quando a conta ainda não possui fator adicional", () => {
    expect(requiresMfaChallenge("aal1", "aal1")).toBe(false);
    expect(requiresMfaChallenge(null, null)).toBe(false);
  });

  it("apresenta nomes compreensíveis para os tipos de fator", () => {
    expect(formatMfaFactorType("totp")).toBe("Aplicativo autenticador");
    expect(formatMfaFactorType("phone")).toBe("Telefone");
    expect(formatMfaFactorType("unknown")).toBe("Segundo fator");
  });

  it("preserva uma rota interna como destino depois do desafio", () => {
    expect(buildMfaRedirectPath("/conta/seguranca")).toBe("/auth/mfa?next=%2Fconta%2Fseguranca");
  });
});
