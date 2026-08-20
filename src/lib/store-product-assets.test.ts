import { describe, expect, it } from "vitest";
import { fsaStoreAssets, resolveFsaProductImage } from "./store-product-assets";

describe("resolveFsaProductImage", () => {
  it("prioriza a foto administrada no CMS, mesmo para produtos com nome institucional", () => {
    expect(resolveFsaProductImage("Camiseta Oficial FSA", "https://cdn.example.com/camiseta-real.webp"))
      .toBe("https://cdn.example.com/camiseta-real.webp");
  });

  it("mantém a arte institucional apenas como fallback sem foto cadastrada", () => {
    expect(resolveFsaProductImage("Copo FSA", null)).toBe(fsaStoreAssets.copo);
    expect(resolveFsaProductImage("Figurinhas FSA", null)).toBe(fsaStoreAssets.adesivos);
  });

  it("não inventa uma imagem para produtos sem fallback conhecido", () => {
    expect(resolveFsaProductImage("Bebida em lata", null)).toBeNull();
  });
});
