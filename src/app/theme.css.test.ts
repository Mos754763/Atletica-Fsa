import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("proteção visual da loja no tema escuro", () => {
  it("mantém a raiz e os blocos essenciais da vitrine explicitamente visíveis", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] main.store-page');
    expect(themeStyles).toContain("visibility:visible!important");
    expect(themeStyles).toContain("opacity:1!important");
    expect(themeStyles).toContain("content-visibility:visible!important");
    expect(themeStyles).toContain(".store-product__visual");
  });

  it("mantém a camada global de efeitos atrás do conteúdo navegável", () => {
    expect(globalStyles).toContain("body>:not(.ambient-scene,.frontend-fx,.theme-toggle)");
    expect(globalStyles).toContain("body>.frontend-fx { z-index:-1; }");
    expect(globalStyles).toContain("body>main.store-page { z-index:10; }");
  });
});
