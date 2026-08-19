import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
) as {
  dependencies?: Record<string, string>;
};

describe("dependências de produção", () => {
  it("não mantém SheetJS vulnerável e fixa os patches transitivos necessários", () => {
    expect(packageJson.dependencies?.xlsx).toBeUndefined();
    expect(packageJson.dependencies?.postcss).toBe("8.5.26");
    expect(packageJson.dependencies?.sharp).toBe("0.35.3");
  });
});
