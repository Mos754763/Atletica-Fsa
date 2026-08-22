import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const component = readFileSync(resolve(process.cwd(), "src/components/theme/ThemeToggle.tsx"), "utf8");
const styles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");

describe("controle de tema arrastável", () => {
  it("mantém arraste por ponteiro, persistência e o clique de alternância separados", () => {
    expect(component).toContain("onPointerDown={handlePointerDown}");
    expect(component).toContain("onPointerMove={handlePointerMove}");
    expect(component).toContain("THEME_TOGGLE_POSITION_STORAGE_KEY");
    expect(component).toContain("Arraste para reposicionar.");
  });

  it("oferece uma área de toque arrastável sem deslocar o layout", () => {
    expect(styles).toContain("position:fixed");
    expect(styles).toContain("touch-action:none");
    expect(styles).toContain('cursor:grab');
    expect(styles).toContain('.theme-toggle[data-positioned="true"]');
    expect(styles).toContain('.theme-toggle[data-dragging="true"]');
  });

  it("abre em uma área livre no topo em mobile sem sobrescrever uma posição já arrastada", () => {
    expect(component).toContain('window.matchMedia("(max-width: 640px)").matches');
    expect(component).toContain("? { x: window.innerWidth - toggleWidth - TOGGLE_MARGIN, y: TOGGLE_MARGIN }");
    expect(component).toContain("setSafePosition(storedPosition ?? initialPosition)");
  });
});
