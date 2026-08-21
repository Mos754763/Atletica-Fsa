import { describe, expect, it, vi } from "vitest";
import { ERP_SIDEBAR_STORAGE_KEY, persistErpSidebarCollapsed, readErpSidebarCollapsed } from "@/components/admin/ErpShell";

describe("sidebar retrátil do ERP", () => {
  it("restaura somente a preferência explicitamente persistida como recolhida", () => {
    expect(readErpSidebarCollapsed("true")).toBe(true);
    expect(readErpSidebarCollapsed("false")).toBe(false);
    expect(readErpSidebarCollapsed(null)).toBe(false);
    expect(readErpSidebarCollapsed("qualquer-outro-valor")).toBe(false);
  });

  it("persiste a escolha de recolher e expandir sob uma chave estável", () => {
    const setItem = vi.fn();
    const storage = { setItem } as Pick<Storage, "setItem">;

    persistErpSidebarCollapsed(storage, true);
    persistErpSidebarCollapsed(storage, false);

    expect(setItem).toHaveBeenNthCalledWith(1, ERP_SIDEBAR_STORAGE_KEY, "true");
    expect(setItem).toHaveBeenNthCalledWith(2, ERP_SIDEBAR_STORAGE_KEY, "false");
  });
});
