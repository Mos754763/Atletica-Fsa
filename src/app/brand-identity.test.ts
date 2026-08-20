import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const globalStyles = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

describe("contrato de identidade visual FSA", () => {
  it("centraliza a paleta institucional nos tokens reutilizáveis", () => {
    expect(globalStyles).toContain("--fsa-blue:#0B3D91");
    expect(globalStyles).toContain("--fsa-yellow:#FFD23F");
    expect(globalStyles).toContain("--fsa-white:#FFF");
    expect(globalStyles).toContain("--fsa-black:#080B12");
  });

  it("mantém os tokens legados mapeados para a fonte institucional", () => {
    expect(globalStyles).toContain("--blue:var(--fsa-blue)");
    expect(globalStyles).toContain("--yellow:var(--fsa-yellow)");
    expect(globalStyles).toContain("--white:var(--fsa-white)");
    expect(globalStyles).toContain("--black:var(--fsa-black)");
  });
});
