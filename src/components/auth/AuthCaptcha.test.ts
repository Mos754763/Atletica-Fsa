import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const captchaSource = readFileSync(new URL("./AuthCaptcha.tsx", import.meta.url), "utf8");

describe("contrato do componente AuthCaptcha", () => {
  it("carrega o widget explicitamente a partir do domínio oficial da Cloudflare", () => {
    expect(captchaSource).toContain('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
    expect(captchaSource).toContain('script.id = TURNSTILE_SCRIPT_ID');
    expect(captchaSource).toContain('window.turnstile ? resolve(window.turnstile)');
  });

  it("mantém a chave de site pública no navegador e nunca referencia a Secret Key", () => {
    expect(captchaSource).toContain("process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()");
    expect(captchaSource).not.toMatch(/TURNSTILE_SECRET/i);
    expect(captchaSource).not.toContain("siteverify");
  });

  it("limpa e invalida o token em expiração, erro, reset e desmontagem", () => {
    expect(captchaSource).toContain('"expired-callback"');
    expect(captchaSource).toContain('"error-callback"');
    expect(captchaSource.match(/onTokenChange\(null\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(captchaSource).toContain("window.turnstile.reset(widgetIdRef.current)");
    expect(captchaSource).toContain("turnstile.remove(widgetIdRef.current)");
  });

  it("expõe estado acessível para carregamento, sucesso e recuperação", () => {
    expect(captchaSource).toContain('role="status"');
    expect(captchaSource).toContain('aria-live="polite"');
    expect(captchaSource).toContain("Conclua a verificação para continuar.");
    expect(captchaSource).toContain("Verificação concluída.");
    expect(captchaSource).toContain("A verificação expirou ou não pôde ser concluída. Tente novamente.");
  });
});
