import { describe, expect, it } from "vitest";
import { isAuthorizedCronRequest } from "./cron-auth";

describe("isAuthorizedCronRequest", () => {
  it("aceita somente o esquema Bearer com segredo completo", () => {
    expect(isAuthorizedCronRequest("Bearer segredo-operacional", "segredo-operacional")).toBe(true);
    expect(isAuthorizedCronRequest("segredo-operacional", "segredo-operacional")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer segredo-operaciona", "segredo-operacional")).toBe(false);
  });

  it("rejeita cabeçalhos ausentes, segredo ausente e tamanhos diferentes", () => {
    expect(isAuthorizedCronRequest(null, "segredo-operacional")).toBe(false);
    expect(isAuthorizedCronRequest("Bearer segredo-operacional", undefined)).toBe(false);
    expect(isAuthorizedCronRequest("Bearer x", "segredo-operacional")).toBe(false);
  });
});
