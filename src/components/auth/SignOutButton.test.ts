import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const signOutSource = readFileSync(new URL("./SignOutButton.tsx", import.meta.url), "utf8");

describe("contrato de encerramento de sessão", () => {
  it("delega a limpeza limitada da sessão ao helper de logout do navegador", () => {
    expect(signOutSource).toContain('import { signOutCurrentBrowserSession } from "@/lib/auth/signout"');
    expect(signOutSource).toContain("await signOutCurrentBrowserSession");
    expect(signOutSource).not.toContain('scope: "global"');
  });

  it("não expõe a mensagem interna do provedor e sempre direciona ao estado público", () => {
    expect(signOutSource).not.toContain("error.message");
    expect(signOutSource).toContain('window.location.replace("/")');
  });
});
