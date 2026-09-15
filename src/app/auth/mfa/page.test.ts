import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerAuthClient, redirect } = vi.hoisted(() => ({
  createServerAuthClient: vi.fn(),
  redirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("@/lib/supabase/server-auth", () => ({ createServerAuthClient }));
vi.mock("next/navigation", () => ({ redirect }));

import MfaPage from "./page";

function renderedText(node: unknown): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(renderedText).join("");
  if (node && typeof node === "object" && "props" in node) {
    return renderedText((node as { props: { children?: unknown } }).props.children);
  }
  return "";
}

function challengeFactorId(node: unknown): string | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const factorId = challengeFactorId(child);
      if (factorId) return factorId;
    }
    return undefined;
  }
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props: { children?: unknown; factorId?: unknown } }).props;
    if (typeof props.factorId === "string") return props.factorId;
    return challengeFactorId(props.children);
  }
  return undefined;
}

function authenticatedClient({
  assurance = { currentLevel: "aal1", nextLevel: "aal2" },
  assuranceError = null,
  factors = { totp: [{ id: "totp-verified", status: "verified" }] },
  factorsError = null,
  accessToken = "server-validated-token",
  sessionError = null,
  session = { access_token: accessToken },
}: {
  assurance?: { currentLevel: string | null; nextLevel: string | null } | null;
  assuranceError?: Error | null;
  factors?: { totp: Array<{ id: string; status: string }> } | null;
  factorsError?: Error | null;
  accessToken?: string | null;
  sessionError?: Error | null;
  session?: { access_token: string | null } | null;
} = {}) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session },
        error: sessionError,
      }),
      mfa: {
        getAuthenticatorAssuranceLevel: vi.fn().mockResolvedValue({ data: assurance, error: assuranceError }),
        listFactors: vi.fn().mockResolvedValue({ data: factors, error: factorsError }),
      },
    },
  };
}

describe("MfaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redireciona uma ausência normal de sessão para o login com next sanitizado", async () => {
    const client = authenticatedClient({ session: null });
    createServerAuthClient.mockResolvedValue(client);

    await expect(MfaPage({ searchParams: Promise.resolve({ next: "https://exemplo.invalid" }) })).rejects.toThrow("redirect:/login?next=%2Fconta");

    expect(redirect).toHaveBeenCalledWith("/login?next=%2Fconta");
    expect(client.auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
    expect(client.auth.mfa.listFactors).not.toHaveBeenCalled();
  });

  it.each([
    ["a conta não possui MFA", { currentLevel: "aal1", nextLevel: "aal1" }, { totp: [] }],
    ["a sessão já atingiu AAL2", { currentLevel: "aal2", nextLevel: "aal2" }, { totp: [{ id: "totp-verified", status: "verified" }] }],
  ])("redireciona no servidor sem montar o desafio quando %s", async (_scenario, assurance, factors) => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({
      assurance,
      factors,
    }));

    await expect(MfaPage({ searchParams: Promise.resolve({ next: "/conta/seguranca" }) })).rejects.toThrow("redirect:/conta/seguranca");
    expect(redirect).toHaveBeenCalledWith("/conta/seguranca");
  });

  it("mantém o usuário na página em caso de falha na consulta de garantia", async () => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({ assuranceError: new Error("provider detail") }));

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
    expect(renderedText(page)).not.toContain("provider detail");
  });

  it("mantém o desafio disponível somente para um fator TOTP verificado que eleva para AAL2", async () => {
    const client = authenticatedClient();
    createServerAuthClient.mockResolvedValue(client);

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(challengeFactorId(page)).toBe("totp-verified");
    expect(client.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalledWith("server-validated-token");
  });

  it("falha fechada quando AAL2 é exigido, mas não há TOTP verificado", async () => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({
      factors: { totp: [{ id: "totp-pending", status: "unverified" }] },
    }));

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
  });

  it("falha fechada quando o resultado local AAL1 contradiz um TOTP verificado", async () => {
    const client = authenticatedClient({
      assurance: { currentLevel: "aal1", nextLevel: "aal1" },
    });
    createServerAuthClient.mockResolvedValue(client);

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
    expect(client.auth.mfa.getAuthenticatorAssuranceLevel).toHaveBeenCalledWith("server-validated-token");
  });

  it("falha fechada quando não há token de acesso para validar", async () => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({ accessToken: null }));

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
  });

  it("falha fechada quando a sessão não pode ser lida", async () => {
    const client = authenticatedClient({ sessionError: new Error("session detail") });
    createServerAuthClient.mockResolvedValue(client);

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
    expect(client.auth.mfa.getAuthenticatorAssuranceLevel).not.toHaveBeenCalled();
  });

  it.each([
    ["a garantia está ausente", null],
    ["o nível atual está ausente", { currentLevel: null, nextLevel: "aal1" }],
    ["o nível é desconhecido", { currentLevel: "aal3", nextLevel: "aal2" }],
  ])("falha fechada quando %s", async (_scenario, assurance) => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({ assurance }));

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
  });

  it("falha fechada quando a garantia regride de AAL2 para AAL1", async () => {
    createServerAuthClient.mockResolvedValue(authenticatedClient({
      assurance: { currentLevel: "aal2", nextLevel: "aal1" },
      factors: { totp: [{ id: "totp-verified", status: "verified" }] },
    }));

    const page = await MfaPage({ searchParams: Promise.resolve({ next: "/conta" }) });

    expect(redirect).not.toHaveBeenCalled();
    expect(renderedText(page)).toContain("Não foi possível confirmar a segurança da sessão.");
  });
});
