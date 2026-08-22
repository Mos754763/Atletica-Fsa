import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const signOutSource = readFileSync(new URL("./SignOutButton.tsx", import.meta.url), "utf8");

describe("contrato de encerramento de sessão", () => {
  it("solicita revogação global e remove a sessão local quando a chamada remota falha", () => {
    expect(signOutSource).toContain('supabase.auth.signOut({ scope: "global" })');
    expect(signOutSource).toContain('supabase.auth.signOut({ scope: "local" })');
    expect(signOutSource).toContain("remoteSignOutFailed");
  });

  it("não expõe a mensagem interna do provedor e redireciona após a tentativa de limpeza", () => {
    expect(signOutSource).not.toContain("signOutError.message");
    expect(signOutSource).toContain('window.location.replace("/")');
  });
});
