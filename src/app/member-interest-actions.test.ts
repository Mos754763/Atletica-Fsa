import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("member-interest server action contract", () => {
  it("does not export runtime values other than asynchronous server actions", () => {
    const source = readFileSync(resolve(process.cwd(), "src/app/member-interest-actions.ts"), "utf8");

    expect(source).toContain('"use server"');
    expect(source).toContain("export async function submitMemberInterest");
    expect(source).not.toMatch(/export\s+(?:const|let|var|class)\s+/);
    expect(source).not.toContain("initialMemberInterestState");
  });
});
