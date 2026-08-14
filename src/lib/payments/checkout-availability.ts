export type CheckoutAvailabilityInput = {
  paymentsEnabled: boolean;
  mercadoPagoAccessToken?: string;
};

export type CheckoutAvailability =
  | { available: true }
  | { available: false; code: "payments_disabled" | "provider_not_configured"; message: string };

export function getCheckoutAvailability(input: CheckoutAvailabilityInput): CheckoutAvailability {
  if (!input.paymentsEnabled) {
    return {
      available: false,
      code: "payments_disabled",
      message: "Os pagamentos online ainda não foram liberados pela administração para operação comercial.",
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
