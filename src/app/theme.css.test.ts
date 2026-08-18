import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");

describe("proteção visual da loja no tema escuro", () => {
  it("mantém a raiz e os blocos essenciais da vitrine explicitamente visíveis", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] main.store-page');
    expect(themeStyles).toContain("visibility:visible!important");
    expect(themeStyles).toContain("opacity:1!important");
    expect(themeStyles).toContain("content-visibility:visible!important");
    expect(themeStyles).toContain(".store-product__visual");
  });
});
