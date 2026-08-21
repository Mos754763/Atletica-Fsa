import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/app/erp.css"), "utf8");

describe("contrato visual da sidebar retrátil", () => {
  it("mantém larguras explícitas e um workspace fluido ao alternar o estado desktop", () => {
    expect(css).toContain("--erp-sidebar-width:252px");
    expect(css).toContain(".erp-shell.is-collapsed { --erp-sidebar-width:88px;");
    expect(css).toContain("grid-template-columns:var(--erp-sidebar-width) minmax(0,1fr)");
  });

  it("preserva a navegação horizontal sem colapsar o layout mobile", () => {
    expect(css).toContain("@media(max-width:760px){.erp-shell,.erp-shell.is-collapsed{grid-template-columns:1fr}");
    expect(css).toContain(".erp-sidebar__collapse{display:none}");
  });

  it("expõe ajuda contextual para os ícones quando a navegação está recolhida", () => {
    expect(css).toContain(".erp-sidebar.is-collapsed .erp-sidebar__nav>a[data-tooltip]::after");
    expect(css).toContain("[data-tooltip]:is(:hover,:focus-visible)::after");
  });
});
