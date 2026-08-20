import { describe, expect, it } from "vitest";
// @ts-expect-error — o roteiro é um executável ESM JavaScript, mantido fora do build da aplicação.
import { resolveHomologationTarget, resolvePreviewHeaders } from "../../../scripts/qa-homologation.mjs";

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

  it("envia bypass de Preview apenas quando o segredo é disponibilizado em ambiente", () => {
    expect(resolvePreviewHeaders(undefined)).toEqual({ "User-Agent": "ATLETICA-FSA-Homologation-QA/1.0" });
    expect(resolvePreviewHeaders(" segredo-temporario ")).toEqual({
      "User-Agent": "ATLETICA-FSA-Homologation-QA/1.0",
      "x-vercel-protection-bypass": "segredo-temporario",
      "x-vercel-set-bypass-cookie": "true",
    });
  });
});
