import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/ci.yml"),
  "utf8",
);

describe("workflow de integração contínua", () => {
  it("usa actions compatíveis com o runtime Node.js 24 sem alterar o Node da aplicação", () => {
    expect(workflow).toContain("actions/checkout@v5");
    expect(workflow).toContain("pnpm/action-setup@v6");
    expect(workflow).toContain("actions/setup-node@v5");
    expect(workflow).toContain("node-version: 22");
    expect(workflow).not.toContain("actions/checkout@v4");
    expect(workflow).not.toContain("pnpm/action-setup@v4");
    expect(workflow).not.toContain("actions/setup-node@v4");
  });
});
