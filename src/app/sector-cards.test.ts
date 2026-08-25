import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "src/app/sector-cards.css"), "utf8");

describe("cards de setores da landing", () => {
  it("declara um ponto focal para cada foto e o aplica à imagem", () => {
    expect((pageSource.match(/imagePosition:/g) ?? [])).toHaveLength(5);
    expect(pageSource).toContain("style={{ objectPosition: sector.imagePosition }}");
  });

  it("mantém uma área de conteúdo estruturada sobre as fotos", () => {
    expect(pageSource).toContain('className="sector-card__copy"');
    expect(styles).toContain(".sector-card__copy {");
    expect(styles).toContain("justify-content: space-between;");
    expect(styles).toContain("position: absolute;");
    expect(styles).toContain("object-fit: cover;");
    expect(styles).toContain("overflow: hidden;");
  });

  it("preserva a grade de cinco frentes e uma leitura de uma coluna no celular", () => {
    expect(styles).toContain("grid-template-columns: repeat(5, minmax(0, 1fr));");
    expect(styles).toContain("@media (max-width: 640px)");
    expect(styles).toContain("grid-template-columns: 1fr;");
  });
});
