import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const nextConfigSource = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

describe("contrato de cabeçalhos HTTP de segurança", () => {
  it("desativa a assinatura do framework e bloqueia incorporação em frames", () => {
    expect(nextConfigSource).toContain("poweredByHeader: false");
    expect(nextConfigSource).toContain('key: "X-Frame-Options", value: "DENY"');
    expect(nextConfigSource).toContain("frame-ancestors 'none'");
  });

  it("declara políticas de conteúdo, abertura e recursos restritivas", () => {
    expect(nextConfigSource).toContain("base-uri 'self'");
    expect(nextConfigSource).toContain("form-action 'self'");
    expect(nextConfigSource).toContain("object-src 'none'");
    expect(nextConfigSource).toContain('key: "Cross-Origin-Opener-Policy", value: "same-origin"');
    expect(nextConfigSource).toContain('key: "Cross-Origin-Resource-Policy", value: "same-origin"');
    expect(nextConfigSource).toContain('key: "X-Content-Type-Options", value: "nosniff"');
  });
});
