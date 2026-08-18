import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const experienceStyles = readFileSync(resolve(process.cwd(), "src/app/experience.css"), "utf8");
const experienceChrome = readFileSync(resolve(process.cwd(), "src/components/fx/ExperienceChrome.tsx"), "utf8");
const managementCarousel = readFileSync(resolve(process.cwd(), "src/components/landing/ManagementCarousel.tsx"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const loginPage = readFileSync(resolve(process.cwd(), "src/app/login/page.tsx"), "utf8");
const resetPasswordPage = readFileSync(resolve(process.cwd(), "src/app/redefinir-senha/page.tsx"), "utf8");
const eventsPage = readFileSync(resolve(process.cwd(), "src/app/eventos/page.tsx"), "utf8");

describe("experiência pública interativa", () => {
  it("desativa o cursor visual para toque e preferência de movimento reduzido", () => {
    expect(experienceStyles).toContain("@media (max-width:720px)");
    expect(experienceStyles).toContain(".experience-chrome__cursor,.experience-chrome__cursor-core { display:none; }");
    expect(experienceStyles).toContain("@media (prefers-reduced-motion:reduce)");
    expect(experienceChrome).toContain("prefers-reduced-motion: reduce");
    expect(experienceChrome).toContain("pointer: fine");
  });

  it("expõe o progresso de rolagem como uma camada sem bloquear interações", () => {
    expect(experienceChrome).toContain("--fsa-scroll-progress");
    expect(experienceStyles).toContain("pointer-events:none");
    expect(experienceStyles).toContain(".experience-chrome__progress");
  });

  it("mantém o carrossel navegável por botões, indicadores e teclas direcionais", () => {
    expect(managementCarousel).toContain('aria-roledescription="carrossel"');
    expect(managementCarousel).toContain('event.key === "ArrowLeft"');
    expect(managementCarousel).toContain('event.key === "ArrowRight"');
    expect(managementCarousel).toContain('role="tablist"');
    expect(managementCarousel).toContain("useReducedMotion");
  });

  it("mantém a interação de produto baseada em transformações e a desativa em toque ou movimento reduzido", () => {
    expect(experienceStyles).toContain(".store-product--interactive");
    expect(experienceStyles).toContain("rotateX(var(--store-card-tilt-x,0deg))");
    expect(experienceStyles).toContain("(pointer:coarse)");
  });

  it("preserva uma hierarquia em bloco entre categoria e título do produto", () => {
    const storeStyles = readFileSync(resolve(process.cwd(), "src/app/store.css"), "utf8");
    expect(storeStyles).toContain(".store-product__body>span,.store-product__title{display:block}");
  });

  it("estende efeitos decorativos às páginas públicas sem bloquear os fluxos", () => {
    expect(experienceStyles).toContain(".auth-page--experience");
    expect(experienceStyles).toContain(".events-page--experience");
    expect(experienceStyles).toContain(".account-page,.protected-page");
    expect(experienceStyles).toContain("pointer-events:none");
    expect(loginPage).toContain('className="auth-page auth-page--experience"');
    expect(resetPasswordPage).toContain("auth-page--experience auth-page--reset");
    expect(eventsPage).toContain('className="events-page events-page--experience"');
  });

  it("usa um recorte transparente persistente com fallback institucional confiável no hero editorial", () => {
    expect(homePage).toContain('const heroArtwork = "/manus-storage/fsa-mascot-hero-transparent_508641e3.png"');
    expect(homePage).toContain('const heroArtworkFallback = institutionalAsset("fsa-hero-gestao-2026.png")');
    expect(experienceStyles).toContain(".hero__official-art { width:min(470px,100%)");
    expect(experienceStyles).toContain("filter:drop-shadow(0 30px 35px rgba(0,0,0,.28))");
  });
});
