import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authStyles = readFileSync(new URL("./auth.css", import.meta.url), "utf8");
const experienceStyles = readFileSync(new URL("./experience.css", import.meta.url), "utf8");

describe("contrato de composição do login", () => {
  it("mantém o login desktop dentro do viewport e centraliza o cartão sem somar padding à altura mínima", () => {
    expect(authStyles).toContain(".auth-page{height:100vh;height:100dvh;min-height:0;display:grid");
    expect(authStyles).toContain(".auth-page__panel{box-sizing:border-box;display:grid;min-height:0;place-items:center");
    expect(authStyles).toContain(".auth-page__intro{position:relative;align-self:stretch;box-sizing:border-box;display:flex;min-height:0");
    expect(authStyles).toContain(".auth-page{height:100vh;height:100dvh;min-height:0;display:grid;grid-template-columns:minmax(0,1.12fr) minmax(420px,.88fr);overflow:hidden");
  });

  it("reduz a composição do painel visual em telas compactas", () => {
    expect(authStyles).toContain("@media(max-width:780px){.auth-page{grid-template-columns:1fr}");
    expect(authStyles).toContain(".auth-page__panel{min-height:auto;padding:38px 20px 52px}");
    expect(authStyles).toContain(".auth-page{height:auto;min-height:100svh;overflow:visible;grid-template-columns:1fr}");
    expect(authStyles).toContain(".auth-page__mascot{right:clamp(16px,5vw,28px)!important;bottom:12px!important;width:clamp(108px,29vw,154px)!important;height:clamp(150px,36vw,210px)!important;min-height:0}");
    expect(authStyles).toContain("@media(max-width:420px){.auth-page__intro{min-height:288px;padding:96px 20px 126px}.auth-page__mascot{right:14px!important;bottom:8px!important;width:clamp(96px,28vw,124px)!important;height:clamp(132px,34vw,170px)!important}");
    expect(authStyles).toContain("@media(max-width:420px){.auth-page__intro{min-height:288px;padding:96px 20px 126px}");
  });

  it("usa o mascote transparente sem recorte circular ou fundo de imagem no login", () => {
    expect(authStyles).toContain(".auth-page__mascot{position:absolute!important;z-index:3!important;right:clamp(0px,1.4vw,20px)!important");
    expect(authStyles).toContain("width:clamp(214px,22vw,340px)!important;height:clamp(292px,39vh,466px)!important;min-height:0!important;overflow:visible!important;background:transparent!important");
    expect(authStyles).toContain(".auth-page__mascot .rabbit-mascot__generated{display:block;width:100%;height:100%;max-height:none;object-fit:contain!important;object-position:center bottom!important}");
    expect(authStyles).toContain("@media(max-height:760px) and (min-width:781px)");
  });

  it("anima a entrada do mascote somente quando a preferência do usuário permite movimento", () => {
    expect(authStyles).toContain("@media(prefers-reduced-motion:no-preference){.auth-page__mascot{will-change:transform,opacity;animation:auth-mascot-enter .56s var(--ease-out) .1s both}");
    expect(authStyles).toContain("@keyframes auth-mascot-enter{from{opacity:0;transform:translate3d(0,18px,0) scale(.96)}to{opacity:1;transform:translate3d(0,0,0) scale(1)}}");
    expect(authStyles).toContain("@media(prefers-reduced-motion:reduce){.auth-page__mascot{animation:none}}");
  });

  it("não deixa a camada decorativa remover o respiro interno do cartão compacto", () => {
    expect(experienceStyles).toContain(".auth-page--experience .auth-card{position:relative;padding:clamp(20px,2.4vw,28px)}");
    expect(experienceStyles).not.toContain(".auth-page--experience .auth-card{position:relative;padding:6px}");
  });
});
