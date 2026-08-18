import { describe, expect, it } from "vitest";
import { buildPasswordRecoveryRedirect, passwordResetSuccess } from "@/lib/auth/password-recovery";

describe("buildPasswordRecoveryRedirect", () => {
  it("direciona o e-mail de recuperação para o callback e a tela de nova senha", () => {
    expect(buildPasswordRecoveryRedirect("https://atletica-preview.vercel.app")).toBe(
      "https://atletica-preview.vercel.app/auth/callback?next=/redefinir-senha",
    );
  });

  it("mantém a origem canônica de Production no callback de recuperação", () => {
    expect(buildPasswordRecoveryRedirect("https://atleticafsa.site")).toBe(
      "https://atleticafsa.site/auth/callback?next=/redefinir-senha",
    );
  });

  it("oferece uma confirmação clara e destinos seguros após a atualização", () => {
    expect(passwordResetSuccess).toMatchObject({
      primaryAction: { href: "/conta?senha=atualizada", label: "Ir para minha conta" },
      secondaryAction: { href: "/loja", label: "Explorar a loja" },
    });
    expect(passwordResetSuccess.title).toContain("senha foi atualizada");
  });
});
