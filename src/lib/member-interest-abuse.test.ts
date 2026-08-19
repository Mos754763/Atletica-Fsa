import { describe, expect, it } from "vitest";
import { clientIpFromHeaders, currentMemberInterestWindow, memberInterestIpHash, validationMessages } from "./member-interest-abuse";

describe("member interest abuse controls", () => {
  it("pseudonimiza a origem de forma determinística sem devolver o endereço bruto", () => {
    const hash = memberInterestIpHash("203.0.113.10", "segredo-de-teste");
    expect(hash).toHaveLength(64);
    expect(hash).toBe(memberInterestIpHash("203.0.113.10", "segredo-de-teste"));
    expect(hash).not.toBe(memberInterestIpHash("203.0.113.11", "segredo-de-teste"));
    expect(hash).not.toContain("203.0.113.10");
  });

  it("prioriza o primeiro endereço encaminhado e agrupa a janela por hora UTC", () => {
    expect(clientIpFromHeaders(new Headers({ "x-forwarded-for": "203.0.113.10, 10.0.0.2" }))).toBe("203.0.113.10");
    expect(currentMemberInterestWindow(new Date("2026-08-19T20:59:55.000Z"))).toBe("2026-08-19T20:00:00.000Z");
  });

  it("consolida os erros de e-mail e consentimento no mesmo retorno", () => {
    expect(validationMessages([{ message: "Informe um e-mail válido." }, { message: "Confirme que podemos usar seus dados para responder ao cadastro." }])).toBe("Informe um e-mail válido. Confirme que podemos usar seus dados para responder ao cadastro.");
  });
});
