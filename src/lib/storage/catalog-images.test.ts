import { describe, expect, it } from "vitest";
import {
  catalogImageExtension,
  MAX_CATALOG_IMAGE_MEGABYTES,
  validateCatalogImage,
} from "./catalog-images";

describe("catalogImageExtension", () => {
  it("aceita formatos de imagem permitidos", () => {
    expect(catalogImageExtension("image/jpeg")).toBe("jpg");
    expect(catalogImageExtension("image/png")).toBe("png");
    expect(catalogImageExtension("image/webp")).toBe("webp");
  });

  it("rejeita formatos não permitidos", () => {
    expect(() => catalogImageExtension("image/svg+xml")).toThrow("JPG, PNG ou WEBP");
  });
});

describe("validateCatalogImage", () => {
  it("aceita uma imagem dentro do limite operacional", () => {
    expect(validateCatalogImage({ size: 512_000, type: "image/png" })).toBe("png");
  });

  it("rejeita arquivo vazio e imagem acima de 3 MB", () => {
    expect(MAX_CATALOG_IMAGE_MEGABYTES).toBe(3);
    expect(() => validateCatalogImage({ size: 0, type: "image/png" })).toThrow("vazia");
    expect(() => validateCatalogImage({ size: 3 * 1024 * 1024 + 1, type: "image/jpeg" })).toThrow("3 MB");
  });
});
