import { describe, expect, it } from "vitest";
import { toBuilderSlug } from "./slugs";

describe("toBuilderSlug", () => {
  it("normaliza acentos, espaços e maiúsculas para chaves técnicas válidas", () => {
    expect(toBuilderSlug("Quantidade mínima por pedido")).toBe("quantidade-minima-por-pedido");
  });

  it("usa um fallback seguro quando o operador não informa uma chave utilizável", () => {
    expect(toBuilderSlug("---", "nova-tabela")).toBe("nova-tabela");
  });
});
