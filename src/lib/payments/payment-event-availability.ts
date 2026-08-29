export type PaymentEventAvailabilityInput = {
  processPaymentEvents: boolean;
  mercadoPagoAccessToken?: string;
  mercadoPagoWebhookSecret?: string;
};

export type PaymentEventAvailability =
  | { available: true }
  | {
      available: false;
      code: "payment_events_disabled" | "provider_not_configured" | "webhook_not_configured";
      message: string;
    };

export function getPaymentEventAvailability(input: PaymentEventAvailabilityInput): PaymentEventAvailability {
  if (!input.processPaymentEvents) {
    return {
      available: false,
      code: "payment_events_disabled",
      message: "O processamento de eventos de pagamento está temporariamente indisponível.",
    };
  }

  if (!input.mercadoPagoAccessToken) {
    return {
      available: false,
      code: "provider_not_configured",
      message: "A conciliação Mercado Pago ainda não possui credencial de acesso.",
    };
  }

  if (!input.mercadoPagoWebhookSecret) {
    return {
      available: false,
      code: "webhook_not_configured",
      message: "A assinatura do webhook Mercado Pago ainda não foi configurada.",
    };
  }

  return { available: true };
}
