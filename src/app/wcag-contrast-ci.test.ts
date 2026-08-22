import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/ci.yml"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};

describe("integração contínua da auditoria WCAG", () => {
  it("executa o contrato de contraste explicitamente em pull requests e atualizações da main", () => {
    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("push:");
    expect(workflow).toContain("- main");
    expect(workflow).toContain("name: WCAG contrast");
    expect(workflow).toContain("run: pnpm test:wcag-contrast");
  });

  it("mantém o comando de contraste isolado para um diagnóstico claro no CI", () => {
    expect(packageJson.scripts["test:wcag-contrast"]).toBe("vitest run src/app/wcag-contrast.test.ts");
  });
});
