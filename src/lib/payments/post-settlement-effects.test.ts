import { describe, expect, it, vi } from "vitest";
import { runPostSettlementEffect } from "./post-settlement-effects";

describe("runPostSettlementEffect", () => {
  it("executa um efeito pós-liquidação bem-sucedido", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);

    await expect(runPostSettlementEffect("order_status_notification", execute)).resolves.toBeUndefined();
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("isola uma falha de notificação para preservar a resposta do webhook", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("mailer unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runPostSettlementEffect("registration_notification", execute)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith("[mercado-pago] efeito pós-liquidação não concluído", {
      effect: "registration_notification",
      errorType: "Error",
    });

    errorSpy.mockRestore();
  });
});
