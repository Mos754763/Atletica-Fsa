export function assertProtectedPreviewTarget(origin) {
  const url = new URL(origin);
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || !hostname.endsWith(".vercel.app")) {
    throw new Error("O E2E protegido exige um Preview HTTPS no domínio *.vercel.app.");
  }
  return url.origin;
}
