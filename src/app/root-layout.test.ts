import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("contrato do layout raiz", () => {
  it("declara o comportamento de scroll suave exigido pelo Next durante transições", () => {
    expect(layoutSource).toContain('<html lang="pt-BR" data-scroll-behavior="smooth" suppressHydrationWarning>');
  });
});
