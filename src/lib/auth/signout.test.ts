import { afterEach, describe, expect, it, vi } from "vitest";
import { signOutCurrentBrowserSession, type BrowserAuthClient } from "./signout";

function clientWith(result: Promise<{ error: unknown | null }>) {
  const signOut = vi.fn(() => result);
  const client: BrowserAuthClient = { auth: { signOut } };
  return { client, signOut };
}

describe("signOutCurrentBrowserSession", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("encerra apenas a sessão atual do navegador e redireciona ao estado público", async () => {
    const { client, signOut } = clientWith(Promise.resolve({ error: null }));
    const redirect = vi.fn();

    await signOutCurrentBrowserSession({ client, redirect });

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledTimes(1);
  });

  it("redireciona mesmo quando o provedor devolve um erro sem expor sua mensagem", async () => {
    const { client } = clientWith(Promise.resolve({ error: new Error("provider detail") }));
    const redirect = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await signOutCurrentBrowserSession({ client, redirect });

    expect(redirect).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith("[auth] local-sign-out-failure", { kind: "Error" });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("provider detail");
  });

  it("redireciona após o timeout quando a limpeza local não responde", async () => {
    vi.useFakeTimers();
    const { client } = clientWith(new Promise(() => undefined));
    const redirect = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const completion = signOutCurrentBrowserSession({ client, redirect, timeoutMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    await completion;

    expect(redirect).toHaveBeenCalledTimes(1);
  });
});
