import { describe, expect, it } from "vitest";
import { buildPickupQrPayload, normalizePickupQrToken } from "./pickup-token";

const token = "6f729c09-3fb5-4b69-9fe0-9c2ca41647b4";

describe("token de retirada", () => {
  it("cria um payload QR opaco com prefixo institucional", () => {
    expect(buildPickupQrPayload(token)).toBe(`FSA:PICKUP:${token}`);
  });

  it("aceita leitura com prefixo, espaços ou diferenças de caixa", () => {
    expect(normalizePickupQrToken(` fsa:pickup:${token.toUpperCase()} `)).toBe(token);
    expect(normalizePickupQrToken(token)).toBe(token);
  });

  it("recusa conteúdo que não seja token UUID", () => {
    expect(normalizePickupQrToken("FSA:PICKUP:PEDIDO-123")).toBeNull();
    expect(normalizePickupQrToken("A1B2C3D4E5")).toBeNull();
  });
});
