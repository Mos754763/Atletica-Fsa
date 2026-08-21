import { describe, expect, it } from "vitest";
import { getSymplaEnvironmentCopy } from "./sympla-environment";

describe("getSymplaEnvironmentCopy", () => {
  it("identifica corretamente a operação em Production", () => {
    const copy = getSymplaEnvironmentCopy("production");

    expect(copy.eyebrow).toBe("INTEGRAÇÕES · PRODUÇÃO");
    expect(copy.safeguardsTitle).toBe("Controles operacionais de produção");
    expect(copy.safeguardsDescription).not.toContain("homologação");
  });

  it("mantém os limites explícitos fora de Production", () => {
    const copy = getSymplaEnvironmentCopy("preview");

    expect(copy.eyebrow).toBe("INTEGRAÇÕES · HOMOLOGAÇÃO");
    expect(copy.safeguardsTitle).toBe("Limites de segurança da homologação");
  });
});
