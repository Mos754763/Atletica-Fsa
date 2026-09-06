import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./MfaLoginChallenge.tsx", import.meta.url), "utf8");

describe("MfaLoginChallenge", () => {
  it("recebe o fator preparado pelo servidor e não consulta a garantia no cliente", () => {
    expect(source).toContain("factorId?: string");
    expect(source).not.toContain("getAuthenticatorAssuranceLevel");
    expect(source).not.toContain("listFactors");
    expect(source).not.toContain("useEffect");
  });

  it("não mostra as instruções ou o formulário de seis dígitos sem fator verificado", () => {
    const unavailableBranch = source.match(/if \(!factorId\) \{([\s\S]*?)\n  \}\n\n  return \(/)?.[1] ?? "";

    expect(unavailableBranch).toContain("Não foi possível preparar a verificação em duas etapas.");
    expect(unavailableBranch).not.toContain("Código do autenticador");
  });
});
