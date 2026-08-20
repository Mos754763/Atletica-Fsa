import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const wordmark = readFileSync(new URL("./FsaWordmark.tsx", import.meta.url), "utf8");

describe("wordmark institucional", () => {
  it("aplica nome acessível apenas à versão compacta e com papel semântico válido", () => {
    expect(wordmark).toContain('...(compact ? { role: "img", "aria-label": "ATLETICA FSA" } : {})');
    expect(wordmark).not.toContain('className={`fsa-wordmark ${className}`} aria-label="ATLETICA FSA"');
  });
});
