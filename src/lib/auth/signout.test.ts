import { afterEach, describe, expect, it, vi } from "vitest";
import { signOutCurrentBrowserSession, type BrowserAuthClient } from "./signout";

function clientWith(
  implementation: BrowserAuthClient["auth"]["signOut"],
) {
  const signOut = vi.fn(implementation);
  const client: BrowserAuthClient = { auth: { signOut } };
  return { client, signOut };
}

describe("signOutCurrentBrowserSession", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("revoga todas as sessões e redireciona ao estado público", async () => {
    const { client, signOut } = clientWith(async () => ({ error: null }));
    const redirect = vi.fn();

    await signOutCurrentBrowserSession({ client, redirect });

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(signOut).toHaveBeenCalledWith({ scope: "global" });
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("faz limpeza local quando a revogação global falha", async () => {
    const { client, signOut } = clientWith(async ({ scope }) => (
      scope === "global" ? { error: new Error("provider detail") } : { error: null }
    ));
    const redirect = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await signOutCurrentBrowserSession({ client, redirect });

    expect(signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    expect(consoleError).toHaveBeenCalledWith("[auth] global-sign-out-failure", { kind: "Error" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("provider detail");
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("redireciona após timeout global e tentativa local limitada", async () => {
    vi.useFakeTimers();
    const { client, signOut } = clientWith(({ scope }) => (
      scope === "global"
        ? new Promise<{ error: unknown | null }>(() => undefined)
        : Promise.resolve({ error: null })
    ));
    const redirect = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const completion = signOutCurrentBrowserSession({ client, redirect, timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await completion;

    expect(signOut).toHaveBeenNthCalledWith(1, { scope: "global" });
    expect(signOut).toHaveBeenNthCalledWith(2, { scope: "local" });
    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
