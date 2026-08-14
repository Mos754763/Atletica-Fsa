import { describe, expect, it } from "vitest";
import { canMoveOrderStatus } from "./workflow";

describe("máquina de estados do pedido", () => {
  it("permite o fluxo operacional pago até entregue", () => {
    expect(canMoveOrderStatus("aguardando_pagamento", "pago")).toBe(true);
    expect(canMoveOrderStatus("pago", "em_preparo")).toBe(true);
    expect(canMoveOrderStatus("em_preparo", "pronto")).toBe(true);
    expect(canMoveOrderStatus("pronto", "entregue")).toBe(true);
  });
  it("bloqueia saltos e mudanças após encerramento", () => {
    expect(canMoveOrderStatus("aguardando_pagamento", "pronto")).toBe(false);
    expect(canMoveOrderStatus("entregue", "em_preparo")).toBe(false);
    expect(canMoveOrderStatus("cancelado", "pago")).toBe(false);
  });
});
