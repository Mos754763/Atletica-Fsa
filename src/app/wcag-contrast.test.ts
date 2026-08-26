import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type Rgb = Readonly<{ r: number; g: number; b: number }>;

const themeStyles = readFileSync(resolve(process.cwd(), "src/app/theme.css"), "utf8");
const globalStyles = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

function hex(value: string): Rgb {
  const normalized = value.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) throw new Error(`Cor hexadecimal inválida: ${value}`);

  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function blend(foreground: Rgb, alpha: number, background: Rgb): Rgb {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const linear = [r, g, b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: Rgb, background: Rgb) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

const appSurface = hex("#0d1524");
const cardSurface = hex("#121e32");
const authCardSurface = hex("#0d294f");
const authFieldSurface = hex("#061a32");
const footerSurface = hex("#041a3b");
const mottoSurface = hex("#030711");
const white = hex("#ffffff");
const yellow = hex("#ffd23f");

const textPairs = [
  ["texto operacional em superfície principal", hex("#e8edf8"), appSurface],
  ["texto operacional em cartão", hex("#e8edf8"), cardSurface],
  ["título operacional em cartão", hex("#f5f8ff"), cardSurface],
  ["texto auxiliar operacional", hex("#aebbd0"), appSurface],
  ["título de autenticação", hex("#f7faff"), authCardSurface],
  ["texto auxiliar de autenticação", hex("#c2cee2"), authCardSurface],
  ["placeholder de autenticação", hex("#b4c1d5"), authFieldSurface],
  ["texto do formulário de interesse", hex("#edf4ff"), authCardSurface],
  ["texto auxiliar do formulário de interesse", hex("#c2cee2"), authCardSurface],
  ["manifesto em modo escuro", white, mottoSurface],
  ["destaque do manifesto em modo escuro", yellow, mottoSurface],
  ["ação do Instagram no rodapé", yellow, footerSurface],
  ["texto descritivo do rodapé", blend(white, 0.61, footerSurface), footerSurface],
  ["links do rodapé", blend(white, 0.72, footerSurface), footerSurface],
  ["informações legais do rodapé", blend(white, 0.52, footerSurface), footerSurface],
] as const;

describe("contraste WCAG das superfícies FSA", () => {
  it.each(textPairs)("mantém %s com contraste de texto AA", (_name, foreground, background) => {
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("mantém foco e limite do botão social com contraste não textual AA", () => {
    expect(contrastRatio(yellow, authCardSurface)).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(blend(white, 0.46, footerSurface), footerSurface)).toBeGreaterThanOrEqual(3);
  });

  it("mantém as raízes públicas, operacionais e de autenticação vinculadas à camada escura global", () => {
    [
      ".capability-strip",
      ".sector-section",
      ".event-section",
      ".account-page",
      ".auth-page",
      ".protected-page",
      ".store-page",
      ".cms-page",
      ".events-admin-page",
      ".my-events-page",
      ".members-page",
      ".reports-page",
      ".operations-page",
      ".erp-shell",
      ".erp-dashboard",
      ".events-page",
      ".crm-activities-page",
      ".erp-integration-page",
    ].forEach((root) => expect(themeStyles).toContain(root));
  });

  it("preserva semântica e borda perceptível no botão social do rodapé", () => {
    expect(homePage).toContain('aria-label="Seguir a FSA no Instagram"');
    expect(globalStyles).toContain(".instagram-link");
    expect(globalStyles).toContain("border:1px solid rgba(255,255,255,.46)");
    expect(themeStyles).toContain('html[data-theme="dark"] .site-footer { background:#041a3b; }');
  });
});
