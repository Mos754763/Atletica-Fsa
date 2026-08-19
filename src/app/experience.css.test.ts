import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const experienceStyles = readFileSync(resolve(process.cwd(), "src/app/experience.css"), "utf8");
const experienceChrome = readFileSync(resolve(process.cwd(), "src/components/fx/ExperienceChrome.tsx"), "utf8");
const managementCarousel = readFileSync(resolve(process.cwd(), "src/components/landing/ManagementCarousel.tsx"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const landingMotion = readFileSync(resolve(process.cwd(), "src/components/landing/LandingMotion.tsx"), "utf8");
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
    expect(managementCarousel).toContain('type CardPosition = "active" | "previous" | "next" | "hidden"');
    expect(managementCarousel).toContain('aria-hidden={!isActive}');
    expect(managementCarousel).toContain('aria-live="polite"');
    expect(experienceStyles).toContain("perspective:1600px");
    expect(experienceStyles).toContain(".people-carousel__slide--previous { transform:translate3d(-34%,0,-180px) rotateY(31deg) scale(.79); }");
    expect(experienceStyles).toContain(".people-carousel__slide--next { transform:translate3d(34%,0,-180px) rotateY(-31deg) scale(.79); }");
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

  it("usa o asset institucional público confirmado no hero editorial", () => {
    expect(homePage).toContain('const heroArtwork = institutionalAsset("fsa-hero-gestao-2026.png")');
    expect(homePage).not.toContain('const heroArtwork = "/manus-storage/');
    expect(experienceStyles).toContain(".hero__mascot-viewport { position:relative");
    expect(experienceStyles).toContain("z-index:5");
    expect(experienceStyles).toContain("border-radius:48% 52% 51% 49%");
    expect(landingMotion).toContain('className="hero__mascot-viewport"');
    expect(landingMotion).toContain('initial={false} animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}');
    expect(experienceStyles).toContain("width:190%");
    expect(experienceStyles).toContain("object-position:62% 10%");
    expect(experienceStyles).toContain("transform:translate(-24%,-11%)");
    expect(experienceStyles).toContain("mix-blend-mode:normal");
    expect(landingMotion).toContain('className="hero__mascot-viewport"');
    expect(landingMotion).toContain("const [artworkSource, setArtworkSource] = useState(artwork)");
    expect(homePage).toContain('<h1>VESTE.<br />VIVE.<br /><em>VENCE.</em></h1>');
    expect(homePage).not.toContain('MotionReveal delay={0.1}><h1>VESTE.');
  });
});
