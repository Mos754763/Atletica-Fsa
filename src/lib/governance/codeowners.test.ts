import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const codeowners = readFileSync(
  new URL("../../../.github/CODEOWNERS", import.meta.url),
  "utf8",
);

describe("CODEOWNERS", () => {
  it("declara um responsável padrão e protege sua própria configuração", () => {
    expect(codeowners).toContain("* @Mos754763 @MRDSSAX");
    expect(codeowners).toContain("/.github/ @Mos754763 @MRDSSAX");
    expect(codeowners).toContain("/.github/CODEOWNERS @Mos754763 @MRDSSAX");
  });

  it("atribui revisão às superfícies operacionais e de segurança críticas", () => {
    [
      "/.github/workflows/ @Mos754763 @MRDSSAX",
      "/src/components/auth/ @Mos754763 @MRDSSAX",
      "/src/lib/auth/ @Mos754763 @MRDSSAX",
      "/src/app/api/payments/ @Mos754763 @MRDSSAX",
      "/src/app/api/ods/ @Mos754763 @MRDSSAX",
      "/supabase/ @Mos754763 @MRDSSAX",
    ].forEach((rule) => expect(codeowners).toContain(rule));
  });

  it("evita sintaxes incompatíveis com CODEOWNERS", () => {
    expect(codeowners).not.toMatch(/^!/m);
    expect(codeowners).not.toMatch(/\[[^\]]+\]/);
  });
});
