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

  it("encaminha o token CAPTCHA somente aos fluxos de autenticação por senha", () => {
    expect(loginFormSource).toContain('import { AuthCaptcha } from "./AuthCaptcha";');
    expect(loginFormSource).toContain("const [captchaToken, setCaptchaToken]");
    expect(loginFormSource).toContain("options: { captchaToken: captchaToken ?? undefined }");
    expect(loginFormSource).toContain("captchaToken: captchaToken ?? undefined");
    expect(loginFormSource).toContain("<AuthCaptcha onTokenChange={updateCaptchaToken} resetKey={captchaResetKey} />");
    expect(loginFormSource).toContain("provider: \"google\"");
    expect(loginFormSource).not.toContain("provider: \"google\", captchaToken");
  });

  it("exige token apenas quando uma Sitekey pública foi configurada e o limpa após uso", () => {
    expect(loginFormSource).toContain("const captchaEnabled = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());");
    expect(loginFormSource).toContain("if (captchaEnabled && !captchaToken)");
    expect(loginFormSource).toContain("disabled={busy || (captchaEnabled && !captchaToken)}");
    expect(loginFormSource).toContain("function resetCaptcha()");
    expect(loginFormSource.match(/resetCaptcha\(\);/g)?.length).toBeGreaterThanOrEqual(3);
  });
});
