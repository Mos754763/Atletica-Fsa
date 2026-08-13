import { describe, expect, it } from "vitest";
import { catalogImageExtension } from "./catalog-images";

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
