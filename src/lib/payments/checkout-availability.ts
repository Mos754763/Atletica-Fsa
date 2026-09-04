export type CheckoutAvailabilityInput = {
  acceptNewCheckouts: boolean;
  processPaymentEvents: boolean;
  mercadoPagoAccessToken?: string;
};

export type CheckoutAvailability =
  | { available: true }
  | { available: false; code: "payments_disabled" | "payment_events_disabled" | "provider_not_configured"; message: string };

export function getCheckoutAvailability(input: CheckoutAvailabilityInput): CheckoutAvailability {
  if (!input.acceptNewCheckouts) {
    return {
      available: false,
      code: "payments_disabled",
      message: "Os pagamentos online ainda não foram liberados pela administração para operação comercial.",
    };
  }

  if (!input.processPaymentEvents) {
    return {
      available: false,
      code: "payment_events_disabled",
      message: "O checkout não pode ser aberto enquanto a conciliação de pagamentos estiver desativada.",
    };
  }

  if (!input.mercadoPagoAccessToken) {
    return {
      available: false,
      code: "provider_not_configured",
      message: "Checkout Mercado Pago ainda não foi configurado pela administração.",
    };
  }

  return { available: true };
}
