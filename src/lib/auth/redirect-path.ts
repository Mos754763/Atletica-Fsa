export function resolveSafeRedirectPath(requestedNext: string | null | undefined, fallback = "/conta") {
  if (!requestedNext || !requestedNext.startsWith("/") || requestedNext.startsWith("//")) return fallback;
  return requestedNext;
}
