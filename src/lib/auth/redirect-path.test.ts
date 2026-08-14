import { describe, expect, it } from "vitest";
import { resolveSafeRedirectPath } from "./redirect-path";

describe("resolveSafeRedirectPath", () => {
  it("mantém o destino autenticado padrão quando nenhum caminho é enviado", () => {
    expect(resolveSafeRedirectPath(null)).toBe("/conta");
  });

  it("aceita somente caminhos internos da aplicação", () => {
    expect(resolveSafeRedirectPath("/conta?boas-vindas=1")).toBe("/conta?boas-vindas=1");
    expect(resolveSafeRedirectPath("/erp")).toBe("/erp");
  });

  it("bloqueia URLs absolutas e caminhos protocol-relative", () => {
    expect(resolveSafeRedirectPath("https://exemplo.invalid")).toBe("/conta");
    expect(resolveSafeRedirectPath("//exemplo.invalid")).toBe("/conta");
  });
});
