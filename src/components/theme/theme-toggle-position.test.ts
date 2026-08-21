import { describe, expect, it } from "vitest";
import { clampThemeTogglePosition, parseThemeTogglePosition } from "./theme-toggle-position";

describe("posição do controle de tema", () => {
  it("limita o botão às margens visíveis da viewport", () => {
    expect(
      clampThemeTogglePosition({ x: -40, y: 900 }, { width: 640, height: 480 }, { width: 112, height: 42 }),
    ).toEqual({ x: 16, y: 422 });
  });

  it("aceita uma preferência serializada e descarta valores inválidos", () => {
    expect(parseThemeTogglePosition('{"x":218,"y":96}')).toEqual({ x: 218, y: 96 });
    expect(parseThemeTogglePosition('{"x":"218","y":96}')).toBeNull();
    expect(parseThemeTogglePosition("not-json")).toBeNull();
  });
});
