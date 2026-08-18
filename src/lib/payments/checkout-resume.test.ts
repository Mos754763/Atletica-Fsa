import { describe, expect, it } from "vitest";
import { canResumeCheckout } from "@/lib/payments/checkout-resume";

describe("canResumeCheckout", () => {
  const now = new Date("2026-08-18T02:00:00.000Z");

  it("permite somente pedido pendente, com preferência e reserva ainda válida", () => {
    expect(canResumeCheckout({ status: "aguardando_pagamento", preferenceId: "pref_123", paymentExpiresAt: "2026-08-18T02:15:00.000Z" }, now)).toBe(true);
  });

  it("bloqueia preferência ausente, estado concluído ou reserva expirada", () => {
    expect(canResumeCheckout({ status: "aguardando_pagamento", preferenceId: null, paymentExpiresAt: "2026-08-18T02:15:00.000Z" }, now)).toBe(false);
    expect(canResumeCheckout({ status: "pago", preferenceId: "pref_123", paymentExpiresAt: "2026-08-18T02:15:00.000Z" }, now)).toBe(false);
    expect(canResumeCheckout({ status: "aguardando_pagamento", preferenceId: "pref_123", paymentExpiresAt: "2026-08-18T01:59:59.000Z" }, now)).toBe(false);
  });
});
