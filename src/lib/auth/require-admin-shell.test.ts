import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createServerAuthClient: vi.fn(),
  createServiceClient: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("@/lib/supabase/server-auth", () => ({ createServerAuthClient: mocks.createServerAuthClient }));
vi.mock("@/lib/supabase/server", () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { requireAdminShell } from "./require-admin-shell";

type HarnessInput = {
  userId?: string;
  profile?: { id: string; email: string; display_name: string; role: "admin" | "backoffice" | "caixa" | "cliente"; is_president: boolean } | null;
  assignments?: ReadonlyArray<{ role: "admin" | "backoffice" | "caixa" | "cliente" }>;
  directorMembership?: ReadonlyArray<{ id: string }>;
  tableGrant?: ReadonlyArray<{ id: string }>;
};

function query(data: unknown) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    like: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data })),
    single: vi.fn(() => Promise.resolve({ data })),
    then: <TResult1 = { data: unknown }, TResult2 = never>(
      onfulfilled?: ((value: { data: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) => Promise.resolve({ data }).then(onfulfilled, onrejected),
  };
  return chain;
}

function installHarness({
  userId = "synthetic-user",
  profile = { id: userId, email: "synthetic@example.test", display_name: "Synthetic", role: "cliente", is_president: false },
  assignments = [],
  directorMembership = [],
  tableGrant = [],
}: HarnessInput = {}) {
  mocks.createServerAuthClient.mockResolvedValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: userId ? { sub: userId } : {} } }) },
    from: vi.fn((table: string) => {
      expect(table).toBe("profiles");
      return query(profile);
    }),
  });
  mocks.createServiceClient.mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "sector_memberships") return query(directorMembership);
      if (table === "permission_grants") return query(tableGrant);
      if (table === "profile_role_assignments") return query(assignments);
      throw new Error(`Tabela inesperada: ${table}`);
    }),
  });
}

describe("requireAdminShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona ao login sem claim de identidade", async () => {
    installHarness({ userId: "" });

    await expect(requireAdminShell()).rejects.toThrow("redirect:/login");
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it("recusa uma identidade sem perfil", async () => {
    installHarness({ profile: null });

    await expect(requireAdminShell()).rejects.toThrow("redirect:/conta?acesso=negado");
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
  });

  it.each(["admin", "caixa", "backoffice"] as const)("permite o papel operacional %s sem grant do builder", async (role) => {
    installHarness({
      profile: { id: "synthetic-user", email: "synthetic@example.test", display_name: "Synthetic", role, is_president: false },
      assignments: [{ role }],
    });

    await expect(requireAdminShell()).resolves.toMatchObject({
      userId: "synthetic-user",
      profile: { roles: [role] },
      canAccessBuilder: false,
    });
  });

  it("permite atribuição operacional mesmo quando profiles.role está defasado", async () => {
    installHarness({ assignments: [{ role: "backoffice" }] });

    await expect(requireAdminShell()).resolves.toMatchObject({
      profile: { role: "cliente", roles: ["backoffice"] },
      canAccessBuilder: false,
    });
  });

  it("recusa cliente sem papel operacional, presidência, diretoria ou grant", async () => {
    installHarness();

    await expect(requireAdminShell()).rejects.toThrow("redirect:/conta?acesso=negado");
  });

  it.each([
    ["presidência", { is_president: true }, [], []],
    ["diretoria vigente", { is_president: false }, [{ id: "membership" }], []],
    ["grant de tabela vigente", { is_president: false }, [], [{ id: "grant" }]],
  ] as const)("permite cliente com acesso ao builder por %s", async (_label, override, directorMembership, tableGrant) => {
    installHarness({
      profile: { id: "synthetic-user", email: "synthetic@example.test", display_name: "Synthetic", role: "cliente", ...override },
      directorMembership,
      tableGrant,
    });

    await expect(requireAdminShell()).resolves.toMatchObject({
      profile: { roles: ["cliente"] },
      canAccessBuilder: true,
    });
  });
});
