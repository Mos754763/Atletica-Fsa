import { describe, expect, it } from "vitest";
import { CARD_HOVER, CARD_TAP, MAGNETIC_SPRING, MOTION_SPRING, REVEAL_VARIANTS } from "./motion-config";

describe("motion configuration", () => {
  it("uses spring transitions with controlled damping", () => {
    expect(MOTION_SPRING.type).toBe("spring");
    expect(MOTION_SPRING.damping).toBeGreaterThan(0);
    expect(MAGNETIC_SPRING.stiffness).toBeGreaterThan(0);
  });

  it("keeps animation transforms within lightweight properties", () => {
    expect(CARD_HOVER).toEqual({ y: -5, scale: 1.01 });
    expect(CARD_TAP).toEqual({ scale: 0.985 });
    expect(REVEAL_VARIANTS.hidden).toMatchObject({ opacity: 0, y: 26 });
  });
});
