import { describe, expect, it } from "vitest";
import { canMoveEventStatus } from "./events";

describe("máquina de estados de eventos", () => {
  it("permite somente as transições operacionais previstas", () => {
    expect(canMoveEventStatus("divulgando", "inscricoes_abertas")).toBe(true);
    expect(canMoveEventStatus("inscricoes_abertas", "em_andamento")).toBe(true);
    expect(canMoveEventStatus("em_andamento", "encerrado")).toBe(true);
  });

  it("bloqueia saltos de status e reabertura de evento encerrado", () => {
    expect(canMoveEventStatus("divulgando", "em_andamento")).toBe(false);
    expect(canMoveEventStatus("encerrado", "inscricoes_abertas")).toBe(false);
  });
});
