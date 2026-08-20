import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authStyles = readFileSync(new URL("./auth.css", import.meta.url), "utf8");

describe("contrato de composição do login", () => {
  it("centraliza o cartão e usa unidades seguras de viewport no desktop", () => {
    expect(authStyles).toContain(".auth-page__panel{display:grid;min-height:100vh;min-height:100dvh;place-items:center");
    expect(authStyles).toContain(".auth-page{min-height:100vh;min-height:100dvh;display:grid");
  });

  it("reduz a composição do painel visual em telas compactas", () => {
    expect(authStyles).toContain("@media(max-width:780px){.auth-page{grid-template-columns:1fr}");
    expect(authStyles).toContain(".auth-page__panel{min-height:auto;padding:38px 20px 52px}");
    expect(authStyles).toContain(".auth-page__mascot{right:20px;bottom:20px;width:130px}");
  });
});
