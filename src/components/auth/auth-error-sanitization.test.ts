import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginSource = readFileSync(new URL("./LoginForm.tsx", import.meta.url), "utf8");
const resetSource = readFileSync(new URL("./PasswordResetForm.tsx", import.meta.url), "utf8");
const mfaSource = readFileSync(new URL("./MfaLoginChallenge.tsx", import.meta.url), "utf8");

describe("contrato de mensagens públicas de autenticação", () => {
  it("não repassa detalhes textuais do provedor em login, recuperação ou MFA", () => {
    for (const source of [loginSource, resetSource, mfaSource]) {
      expect(source).not.toMatch(/(?:authError|updateError|challengeError|verifyError)\.message/);
    }
  });

  it("mantém mensagens públicas acionáveis nos fluxos críticos", () => {
    expect(loginSource).toContain("Não foi possível entrar com essas credenciais.");
    expect(resetSource).toContain("Solicite um novo link de recuperação.");
    expect(mfaSource).toContain("Confira o aplicativo autenticador e tente novamente.");
  });
});
