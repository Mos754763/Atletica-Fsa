import packageJson from "../../package.json";
import { describe, expect, it } from "vitest";

describe("configuração de build", () => {
  it("executa o build Next.js com NODE_ENV=production explícito", () => {
    expect(packageJson.scripts.build).toBe("NODE_ENV=production next build");
  });
});
