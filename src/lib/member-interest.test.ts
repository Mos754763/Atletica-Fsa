import { describe, expect, it } from "vitest";
import { parseMemberInterest } from "./member-interest";

const validInterest = {
  fullName: "Marina da Silva",
  email: "MARINA@EXEMPLO.COM",
  interests: ["Eventos", "Marketing"],
  consent: "on",
};

describe("parseMemberInterest", () => {
  it("normaliza o e-mail e aceita campos opcionais vazios", () => {
    const result = parseMemberInterest({ ...validInterest, whatsapp: undefined, course: undefined, semester: undefined, message: undefined });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("marina@exemplo.com");
  });

  it("exige consentimento explícito", () => {
    const result = parseMemberInterest({ ...validInterest, consent: undefined });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toContain("Confirme");
  });

  it("limita as áreas de interesse selecionadas", () => {
    const result = parseMemberInterest({
      ...validInterest,
      interests: ["Esportes", "Eventos", "Marketing", "Sociais", "Suprimentos"],
    });

    expect(result.success).toBe(false);
  });
});
