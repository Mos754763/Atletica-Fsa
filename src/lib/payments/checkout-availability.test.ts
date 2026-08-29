import { describe, expect, it } from "vitest";
import { getCheckoutAvailability } from "./checkout-availability";

describe("disponibilidade do checkout comercial", () => {
  it("bloqueia pagamento mesmo com token enquanto o gate comercial não estiver liberado", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: false, mercadoPagoAccessToken: "APP_USR-token" })).toMatchObject({
      available: false,
      code: "payments_disabled",
    });
  });

  it("bloqueia pagamento quando a ativação existir sem token do provedor", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: true })).toMatchObject({
      available: false,
      code: "provider_not_configured",
    });
  });

  it("libera somente quando o gate e a credencial estiverem configurados", () => {
    expect(getCheckoutAvailability({ acceptNewCheckouts: true, mercadoPagoAccessToken: "APP_USR-token" })).toEqual({ available: true });
  });
});
