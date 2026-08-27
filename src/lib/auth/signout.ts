export const SIGN_OUT_TIMEOUT_MS = 5_000;

type SignOutScope = "local";

type SignOutResult = {
  error: unknown | null;
};

export type BrowserAuthClient = {
  auth: {
    signOut: (options: { scope: SignOutScope }) => Promise<SignOutResult>;
  };
};

type SignOutOptions = {
  client: BrowserAuthClient;
  redirect: () => void;
  timeoutMs?: number;
};

function errorKind(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}

async function settleWithin<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("sign_out_timeout")), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Ends only the browser's current session. The UI must never remain blocked
 * when Auth is unavailable, so the public redirect is guaranteed after a
 * bounded local cleanup attempt.
 */
export async function signOutCurrentBrowserSession({
  client,
  redirect,
  timeoutMs = SIGN_OUT_TIMEOUT_MS,
}: SignOutOptions) {
  try {
    const result = await settleWithin(client.auth.signOut({ scope: "local" }), timeoutMs);
    if (result.error) throw result.error;
  } catch (error) {
    console.error("[auth] local-sign-out-failure", { kind: errorKind(error) });
  } finally {
    redirect();
  }
}
