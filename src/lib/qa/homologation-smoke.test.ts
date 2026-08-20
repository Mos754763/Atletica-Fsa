import { describe, expect, it } from "vitest";
import {
  resolveHomologationTarget,
  resolvePreviewHeaders,
  resolvePreviewRequestHeaders,
  resolvePreviewShareUrl,
} from "../../../scripts/qa-homologation.mjs";

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

  it("aceita somente acesso temporário da Vercel vinculado ao mesmo Preview", () => {
    const origin = "https://atletica-preview-123.vercel.app";
    expect(resolvePreviewShareUrl(`${origin}/?_vercel_share=temporario`, origin))
      .toBe(`${origin}/?_vercel_share=temporario`);
    expect(() => resolvePreviewShareUrl("https://outro-preview.vercel.app/?_vercel_share=temporario", origin))
      .toThrow(/mesmo Preview/);
    expect(() => resolvePreviewShareUrl(`${origin}/`, origin))
      .toThrow(/acesso temporário/);
  });

  it("converte o acesso temporário em cookie de execução sem incluir a URL no cabeçalho", async () => {
    const fetchMock = async () => new Response(null, {
      status: 307,
      headers: { "set-cookie": "_vercel_auth=temporario; Path=/; HttpOnly" },
    });

    await expect(resolvePreviewRequestHeaders(
      undefined,
      "https://atletica-preview-123.vercel.app/?_vercel_share=temporario",
      "https://atletica-preview-123.vercel.app",
      fetchMock,
    )).resolves.toEqual({
      "User-Agent": "ATLETICA-FSA-Homologation-QA/1.0",
      Cookie: "_vercel_auth=temporario",
    });
  });
});
