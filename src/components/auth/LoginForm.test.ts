import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loginFormSource = readFileSync(new URL("./LoginForm.tsx", import.meta.url), "utf8");

describe("contrato de autenticação Google do login", () => {
  it("mantém o botão visível e inicia o provedor Google", () => {
    expect(loginFormSource).toContain('className="auth-google"');
    expect(loginFormSource).toContain("Continuar com Google");
    expect(loginFormSource).toContain('provider: "google"');
  });

  it("retorna ao callback interno preservando apenas o destino seguro", () => {
    expect(loginFormSource).toContain("resolveSafeRedirectPath(new URLSearchParams(window.location.search).get(\"next\"), \"/conta\")");
    expect(loginFormSource).toContain("buildMfaRedirectPath(nextPath)");
    expect(loginFormSource).toContain("redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(mfaRedirectPath())}`");
  });

  it("não expõe mensagens textuais do provedor de autenticação", () => {
    expect(loginFormSource).not.toContain("authError.message");
    expect(loginFormSource).toContain("function authFailureMessage(mode: AuthMode)");
    expect(loginFormSource).toContain("Não foi possível entrar com essas credenciais.");
    expect(loginFormSource).toContain("Não foi possível concluir o cadastro agora.");
    expect(loginFormSource).toContain("Não foi possível iniciar a autenticação com Google.");
  });
});
