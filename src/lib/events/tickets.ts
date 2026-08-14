export type EventTicketStatus = "pendente_pagamento" | "emitido" | "usado" | "cancelado";

export function normalizeTicketCheckInCode(value: string) {
  return value.trim().replace(/^FSA:TICKET:/i, "").toUpperCase();
}

export function canTransferEventTicket(status: EventTicketStatus) {
  return status === "emitido";
}
