import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const mobileOverflowStyles = readFileSync(resolve(process.cwd(), "src/app/mobile-overflow.css"), "utf8");

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

  it("remove camadas decorativas que possam encobrir o conteúdo no tema escuro", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .ambient-scene,html[data-theme="dark"] .frontend-fx');
    expect(themeStyles).toContain("display:none!important");
  });

  it("mantém transparente o invólucro do carrinho quando ele está fechado", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .store-cart { background-color:transparent!important; }');
  });

  it("aplica superfícies e texto legíveis à área de Pessoas no Backoffice escuro", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .members-page { --white:#121e32;');
    expect(themeStyles).toContain("--blue-ink:#f5f8ff");
    expect(themeStyles).toContain(".members-abuse-card,.members-invite-card,.members-list-card");
    expect(themeStyles).toContain(".members-abuse-kpis article");
  });

  it("não permite que o drawer fechado ou o layout de recuperação ampliem a página em telas móveis", () => {
    expect(mobileOverflowStyles).toContain(".store-cart {");
    expect(mobileOverflowStyles).toContain("overflow: hidden;");
    expect(mobileOverflowStyles).toContain(".store-page {");
    expect(mobileOverflowStyles).toContain("overflow-x: clip;");
    expect(mobileOverflowStyles).toContain("html:has(.store-page)");
    expect(mobileOverflowStyles).toContain(".auth-page--reset");
    expect(mobileOverflowStyles).toContain("grid-template-columns: minmax(0, 1fr);");
  });

  it("posiciona inicialmente o acionador móvel de tema na área livre do hero sem remover o arrasto", () => {
    expect(themeStyles).toContain("@media(max-width:640px){.theme-toggle{top:14px;right:13px;bottom:auto;left:auto;");
    expect(themeStyles).toContain(".theme-toggle[data-positioned=\"true\"] { right:auto; bottom:auto; }");
    expect(themeStyles).toContain("touch-action:none");
  });
});
