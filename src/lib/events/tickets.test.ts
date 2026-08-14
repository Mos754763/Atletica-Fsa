import { describe, expect, it } from "vitest";
import { canTransferEventTicket, normalizeTicketCheckInCode } from "./tickets";

describe("regras de ingressos", () => {
  it("normaliza o código recebido por leitor QR", () => {
    expect(normalizeTicketCheckInCode(" fsa:ticket:ab12cd ")).toBe("AB12CD");
  });

  it("permite transferência somente antes do uso do ingresso", () => {
    expect(canTransferEventTicket("emitido")).toBe(true);
    expect(canTransferEventTicket("usado")).toBe(false);
    expect(canTransferEventTicket("pendente_pagamento")).toBe(false);
  });
});
