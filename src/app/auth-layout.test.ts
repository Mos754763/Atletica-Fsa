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
    expect(authStyles).toContain(".auth-page__mascot{right:clamp(12px,4vw,24px)!important;bottom:16px!important;width:clamp(112px,30vw,160px)!important}");
    expect(authStyles).toContain("@media(max-width:420px){.auth-page__mascot{right:12px!important;bottom:12px!important;width:clamp(112px,32vw,136px)!important}}");
    expect(authStyles).toContain("@media(max-width:420px){.auth-page__intro{min-height:288px;padding:96px 20px 126px}");
  });

  it("usa no login o mesmo enquadramento circular do mascote institucional no hero", () => {
    expect(authStyles).toContain(".auth-page__mascot{position:absolute!important;z-index:3!important;right:clamp(0px,1.6vw,22px)!important");
    expect(authStyles).toContain("width:clamp(250px,26vw,405px)!important;min-height:0!important;aspect-ratio:1!important;overflow:hidden!important;border-radius:50%!important;background:#061c48");
    expect(authStyles).toContain(".auth-page__mascot .rabbit-mascot__generated{display:block;width:100%;height:100%;max-height:none;object-fit:cover!important;object-position:center top!important}");
    expect(authStyles).toContain("@media(max-height:760px) and (min-width:781px)");
  });
});
