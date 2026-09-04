import { describe, expect, it } from "vitest";
import { getPaymentEventAvailability } from "./payment-event-availability";

const configured = {
  mercadoPagoAccessToken: "APP_USR-token",
  mercadoPagoWebhookSecret: "webhook-secret",
};

describe("disponibilidade do processamento de eventos de pagamento", () => {
  it("bloqueia o consumidor somente quando o gate específico estiver fechado", () => {
    expect(getPaymentEventAvailability({ processPaymentEvents: false, ...configured })).toMatchObject({
      available: false,
      code: "payment_events_disabled",
    });
  });

  it("exige a credencial do provedor", () => {
    expect(getPaymentEventAvailability({ processPaymentEvents: true, mercadoPagoWebhookSecret: "webhook-secret" })).toMatchObject({
      available: false,
      code: "provider_not_configured",
    });
  });

  it("exige o segredo de assinatura", () => {
    expect(getPaymentEventAvailability({ processPaymentEvents: true, mercadoPagoAccessToken: "APP_USR-token" })).toMatchObject({
      available: false,
      code: "webhook_not_configured",
    });
  });

  it("processa obrigações existentes quando o consumidor e as credenciais estão ativos", () => {
    expect(getPaymentEventAvailability({ processPaymentEvents: true, ...configured })).toEqual({ available: true });
  });
});
