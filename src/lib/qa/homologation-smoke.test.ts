import { describe, expect, it } from "vitest";
// @ts-expect-error — o roteiro é um executável ESM JavaScript, mantido fora do build da aplicação.
import { resolveHomologationTarget } from "../../../scripts/qa-homologation.mjs";

describe("roteiro de QA em homologação", () => {
  it("aceita um preview Vercel somente quando o ambiente é declarado como homologação", () => {
    expect(resolveHomologationTarget("https://atletica-preview-123.vercel.app/loja", "homologation"))
      .toBe("https://atletica-preview-123.vercel.app");
  });

  it("recusa Production e aliases da main antes de qualquer requisição", () => {
    expect(() => resolveHomologationTarget("https://atleticafsa.site", "homologation")).toThrow(/Production/);
    expect(() => resolveHomologationTarget("https://atletica-fsa-git-main-equipe.vercel.app", "homologation")).toThrow(/Production/);
  });

  it("recusa execução quando o ambiente não foi declarado como homologação", () => {
    expect(() => resolveHomologationTarget("https://atletica-preview-123.vercel.app", "production")).toThrow(/QA_ENVIRONMENT/);
  });
});
