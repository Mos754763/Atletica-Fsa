import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const storefront = readFileSync(new URL("./Storefront.tsx", import.meta.url), "utf8");
const storeStyles = readFileSync(new URL("../../app/store.css", import.meta.url), "utf8");

describe("contrato de navegação móvel da loja", () => {
  it("remove o trilho flutuante que sobrepunha os produtos em telas compactas", () => {
    expect(storeStyles).toContain("@media(max-width:820px){.store-nav{position:sticky");
    expect(storeStyles).toContain(".store-rail{display:none}");
  });

  it("mantém acesso explícito ao retorno, eventos e carrinho pela navegação persistente", () => {
    expect(storefront).toContain('aria-label="Voltar ao início da ATLETICA FSA"');
    expect(storefront).toContain('href="/eventos"');
    expect(storefront).toContain('className="store-cart-trigger"');
  });
});
