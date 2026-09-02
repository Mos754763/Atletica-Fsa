export const SIGN_OUT_TIMEOUT_MS = 5_000;

type SignOutScope = "global" | "local";

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
 * Revokes every session first, then always clears the current browser storage.
 * The explicit local pass matters because revoked access tokens can remain
 * valid until expiry even after the global request succeeds.
 */
export async function signOutCurrentBrowserSession({
  client,
  redirect,
  timeoutMs = SIGN_OUT_TIMEOUT_MS,
}: SignOutOptions) {
  try {
    try {
      const globalResult = await settleWithin(client.auth.signOut({ scope: "global" }), timeoutMs);
      if (globalResult.error) throw globalResult.error;
    } catch (globalError) {
      console.error("[auth] global-sign-out-failure", { kind: errorKind(globalError) });
    }

    try {
      const localResult = await settleWithin(client.auth.signOut({ scope: "local" }), timeoutMs);
      if (localResult.error) throw localResult.error;
    } catch (localError) {
      console.error("[auth] local-sign-out-failure", { kind: errorKind(localError) });
    }
  } finally {
    redirect();
  }
}
