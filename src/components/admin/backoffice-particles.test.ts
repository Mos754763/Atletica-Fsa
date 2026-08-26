import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "src/components/admin/BackofficeParticles.tsx"), "utf8");
const motionStyles = readFileSync(resolve(process.cwd(), "src/app/motion.css"), "utf8");
const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");

describe("partículas interativas do Backoffice", () => {
  it("responde ao ponteiro sem receber cliques ou bloquear o conteúdo", () => {
    expect(component).toContain('document.addEventListener("pointermove", updatePosition');
    expect(component).toContain('className="backoffice-particles" aria-hidden="true"');
    expect(motionStyles).toContain("pointer-events:none");
    expect(motionStyles).toContain("--backoffice-pointer-x");
  });

  it("respeita movimento reduzido e exibe uma composição própria no tema escuro", () => {
    expect(component).toContain('"(prefers-reduced-motion: reduce)"');
    expect(motionStyles).toContain(".motion-pointer-aura,.motion-highlight-particles,.backoffice-particles { display:none; }");
    expect(themeStyles).toContain('html[data-theme="dark"] .backoffice-particles');
  });
});
