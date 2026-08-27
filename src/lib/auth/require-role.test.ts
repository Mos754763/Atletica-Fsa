import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerAuthClient, hasSupabaseConfig, redirect } = vi.hoisted(() => ({
  createServerAuthClient: vi.fn(),
  hasSupabaseConfig: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("@/lib/env", () => ({ hasSupabaseConfig }));
vi.mock("@/lib/supabase/server-auth", () => ({ createServerAuthClient }));
vi.mock("next/navigation", () => ({ redirect }));

import { requireRole } from "./require-role";

describe("requireRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona para login sem inicializar o cliente quando Supabase não está configurado", async () => {
    hasSupabaseConfig.mockReturnValue(false);

    await expect(requireRole(["admin"])).rejects.toThrow("redirect:/login");

    expect(redirect).toHaveBeenCalledWith("/login");
    expect(createServerAuthClient).not.toHaveBeenCalled();
  });
});
