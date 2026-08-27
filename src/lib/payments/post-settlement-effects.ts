type PostSettlementEffect = "order_status_notification" | "registration_notification";

/**
 * Notificações e automações são efeitos secundários: uma falha nelas nunca
 * pode reabrir um webhook cuja liquidação financeira já foi concluída.
 */
export async function runPostSettlementEffect(effect: PostSettlementEffect, execute: () => Promise<void>) {
  try {
    await execute();
  } catch (error) {
    console.error("[mercado-pago] efeito pós-liquidação não concluído", {
      effect,
      errorType: error instanceof Error ? error.name : "unknown",
    });
  }
}
