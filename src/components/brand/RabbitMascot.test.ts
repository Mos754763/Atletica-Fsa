import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const rabbitMascot = readFileSync(new URL("./RabbitMascot.tsx", import.meta.url), "utf8");
const erpMascotStyles = readFileSync(new URL("../../app/erp-mascot.css", import.meta.url), "utf8");

describe("mascote institucional do ERP", () => {
  it("usa um asset institucional público validado em vez do caminho indisponível", () => {
    expect(rabbitMascot).toContain('institutionalAsset("fsa-rabbit-mascot.png")');
    expect(rabbitMascot).not.toContain('institutionalAsset("fsa-hero-gestao-2026.png")');
    expect(rabbitMascot).not.toContain("fsa-mascot-alpha_2021fade.png");
  });

  it("mantém fallback semântico caso a mídia não possa ser carregada", () => {
    expect(rabbitMascot).toContain("onError={() => setImageUnavailable(true)}");
    expect(rabbitMascot).toContain('role="img" aria-label="Coelho mascote da ATLETICA FSA com tapa-olho e uniforme FSA"');
    expect(erpMascotStyles).toContain(".rabbit-mascot__fallback");
  });
});
