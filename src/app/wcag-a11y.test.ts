import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const landing = read("src/app/page.tsx");
const carousel = read("src/components/landing/ManagementCarousel.tsx");
const memberInterest = read("src/components/landing/MemberInterestForm.tsx");
const mobileNav = read("src/components/landing/MobileNav.tsx");
const login = read("src/components/auth/LoginForm.tsx");
const themeCss = read("src/app/theme.css");
const authCss = read("src/app/auth.css");
const memberInterestCss = read("src/app/member-interest.css");

function collectSourceFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? collectSourceFiles(path) : /\.(tsx?|css)$/.test(entry.name) ? [read(path)] : [];
  });
}

describe("contratos WCAG de teclado e leitores de tela", () => {
  it("mantém landmarks e rótulos acessíveis na landing e no formulário público", () => {
    expect(landing).toContain("<main>");
    expect(landing).toContain('aria-label="Navegação principal"');
    expect(landing).toContain('<footer className="site-footer">');
    expect(landing).toContain('aria-label="Seguir a FSA no Instagram"');
    expect(memberInterest).toContain("<fieldset>");
    expect(memberInterest).toContain("<legend>");
    expect(memberInterest).toContain('role="status"');
    expect(memberInterest).toContain('required');
  });

  it("expõe nome, papel, estado e relações para controles personalizados", () => {
    expect(mobileNav).toContain('aria-expanded={open}');
    expect(mobileNav).toContain('aria-controls="fsa-mobile-menu"');
    expect(carousel).toContain('aria-roledescription="carrossel"');
    expect(carousel).toContain('aria-live="polite"');
    expect(carousel).toContain('role="tablist"');
    expect(carousel).toContain('role="tab"');
    expect(carousel).toContain('role="tabpanel"');
    expect(carousel).toContain('aria-controls={`gestao-slide-${index}`}');
    expect(carousel).toContain('aria-labelledby={`gestao-tab-${index}`}');
  });

  it("preserva navegação por teclado do carrossel e foco visível nos fluxos críticos", () => {
    expect(carousel).toContain('event.key === "ArrowLeft"');
    expect(carousel).toContain('event.key === "ArrowRight"');
    expect(carousel).toContain('event.key === "Home"');
    expect(carousel).toContain('event.key === "End"');
    expect(carousel).toContain("event.preventDefault()");
    expect(themeCss).toContain(":focus-visible");
    expect(authCss).toContain(":has(input:focus-visible)");
    expect(memberInterestCss).toContain(":focus-visible");
  });

  it("mantém feedbacks de autenticação anunciáveis e evita tabindex positivo", () => {
    expect(login).toContain('role="alert"');
    expect(login).toContain('role="status"');
    const allSources = collectSourceFiles("src").join("\n");
    expect(allSources).not.toMatch(/tabindex\s*=\s*["'][1-9]|tabIndex\s*=\s*\{[1-9]/i);
  });
});
