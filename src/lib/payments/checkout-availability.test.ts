import { describe, expect, it } from "vitest";
import { getCheckoutAvailability } from "./checkout-availability";

describe("disponibilidade do checkout comercial", () => {
  it("bloqueia pagamento mesmo com token enquanto o gate comercial não estiver liberado", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: false, processPaymentEvents: true, mercadoPagoAccessToken: "APP_USR-token" })).toMatchObject({
      available: false,
      code: "payments_disabled",
    });
  });

  it("bloqueia pagamento quando a ativação existir sem token do provedor", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: true, processPaymentEvents: true })).toMatchObject({
      available: false,
      code: "provider_not_configured",
    });
  });

  it("bloqueia a criação quando o consumidor de eventos estiver desligado", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: true, processPaymentEvents: false, mercadoPagoAccessToken: "APP_USR-token" })).toMatchObject({
      available: false,
      code: "payment_events_disabled",
    });
  });

  it("libera somente quando os gates e a credencial estiverem configurados", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: true, processPaymentEvents: true, mercadoPagoAccessToken: "APP_USR-token" })).toEqual({ available: true });
  });
});
