import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const mobileOverflowStyles = readFileSync(resolve(process.cwd(), "src/app/mobile-overflow.css"), "utf8");
const memberInterestStyles = readFileSync(resolve(process.cwd(), "src/app/member-interest.css"), "utf8");
const resetPasswordStyles = readFileSync(resolve(process.cwd(), "src/app/redefinir-senha/reset-password.module.css"), "utf8");

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

  it("posiciona inicialmente o acionador móvel de tema abaixo da navegação sem remover o arrasto", () => {
    expect(themeStyles).toContain("@media(max-width:640px){.theme-toggle{top:72px;right:13px;bottom:auto;left:auto;");
    expect(themeStyles).toContain(".theme-toggle[data-positioned=\"true\"] { right:auto; bottom:auto; }");
    expect(themeStyles).toContain("touch-action:none");
  });

  it("define superfícies próprias, legíveis e focáveis para o login no modo escuro", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .auth-page { --auth-panel:#061a3d;');
    expect(themeStyles).toContain("--auth-card:#0d294f");
    expect(themeStyles).toContain("--auth-accent:#ffd23f");
    expect(themeStyles).toContain('html[data-theme="dark"] .auth-page .auth-card');
    expect(themeStyles).toContain('html[data-theme="dark"] .auth-page .auth-google');
    expect(themeStyles).toContain('html[data-theme="dark"] .auth-page .auth-field:has(input:focus-visible)');
    expect(themeStyles).toContain("border-color:#ffd23f");
  });

  it("mantém a diretoria e o formulário de interesse com superfícies e contraste próprios no escuro", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .management-section');
    expect(themeStyles).toContain('html[data-theme="dark"] .people-carousel__arrow');
    expect(themeStyles).toContain('html[data-theme="dark"] .membership-form');
    expect(themeStyles).toContain('html[data-theme="dark"] .membership-form :is(input:not([type=checkbox]),textarea)');
    expect(themeStyles).toContain('html[data-theme="dark"] .site-footer');
    expect(memberInterestStyles).toContain(".membership-form");
    expect(memberInterestStyles).toContain(".membership-form :is(input:not([type=checkbox]),textarea):focus-visible");
    expect(memberInterestStyles).toContain(".membership-form__interests input:focus-visible+span");
  });

  it("alinha a redefinição de senha aos tokens escuros de autenticação", () => {
    expect(resetPasswordStyles).toContain(':global(html[data-theme="dark"]) .panel');
    expect(resetPasswordStyles).toContain("linear-gradient(145deg, #061a3d 0%, #04142e 100%)");
    expect(resetPasswordStyles).toContain(".auth-card--reset .auth-field:has(input:focus-visible)");
    expect(resetPasswordStyles).toContain("box-shadow: 0 0 0 2px rgba(255, 210, 63, 0.72)");
  });

  it("cobre as superfícies exclusivas de eventos e das telas operacionais do ERP", () => {
    expect(themeStyles).toContain('html[data-theme="dark"] .events-page');
    expect(themeStyles).toContain('html[data-theme="dark"] :is(.crm-activities-page,.erp-integration-page)');
    expect(themeStyles).toContain(".crm-expectation-panel,.crm-timeline-panel,.erp-kpi,.erp-card,.crm-timeline-item");
    expect(themeStyles).toContain(".crm-expectation-form,.crm-filterbar,.crm-state-pill");
  });

  it("limita a transição global à troca manual e a desativa para redução de movimento", () => {
    expect(themeStyles).toContain("html.is-theme-transitioning body,html.is-theme-transitioning body *");
    expect(themeStyles).toContain("transition:background-color .22s var(--ease-out),color .18s var(--ease-out),border-color .18s var(--ease-out),box-shadow .22s var(--ease-out)");
    expect(themeStyles).toContain("@media(prefers-reduced-motion:reduce)");
    expect(themeStyles).toContain("transition:none");
  });
});
