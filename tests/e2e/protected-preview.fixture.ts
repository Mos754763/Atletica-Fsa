import { expect, test as base } from "@playwright/test";
import type { BrowserContext } from "@playwright/test";

const bypassHeaders = ["x-vercel-protection-bypass", "x-vercel-set-bypass-cookie"];

export function protectedPreviewRequestHeaders(requestUrl: string, headers: Record<string, string>, previewOrigin: string, bypassSecret: string) {
  const nextHeaders = { ...headers };
  for (const name of Object.keys(nextHeaders)) {
    if (bypassHeaders.includes(name.toLowerCase())) delete nextHeaders[name];
  }

  if (new URL(requestUrl).origin === previewOrigin) {
    nextHeaders["x-vercel-protection-bypass"] = bypassSecret;
    nextHeaders["x-vercel-set-bypass-cookie"] = "true";
  }

  return nextHeaders;
}

export async function installProtectedPreviewRouting(context: BrowserContext, previewOrigin: string, bypassSecret: string) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const headers = protectedPreviewRequestHeaders(request.url(), request.headers(), previewOrigin, bypassSecret);
    if (new URL(request.url()).origin === previewOrigin) {
      try {
        const response = await route.fetch({ headers, maxRedirects: 0 });
        await route.fulfill({ response });
      } catch (error) {
        if (!(error instanceof Error) || !/Target page, context or browser has been closed/i.test(error.message)) throw error;
      }
      return;
    }
    await route.continue({ headers });
  });
}

const previewOrigin = process.env.QA_PROTECTED_PREVIEW_ORIGIN;
const bypassSecret = process.env.QA_PROTECTED_PREVIEW_BYPASS_HEADER;
const protectedMode = Boolean(previewOrigin || bypassSecret);

if (protectedMode && (!previewOrigin || !bypassSecret)) {
  throw new Error("Os marcadores internos do Preview protegido estão incompletos.");
}

export const test = base.extend({
  page: async ({ page, context }, runPage) => {
    if (protectedMode) {
      await installProtectedPreviewRouting(context, previewOrigin as string, bypassSecret as string);
    }
    try {
      await runPage(page);
    } finally {
      if (protectedMode) await context.unrouteAll({ behavior: "wait" });
    }
  },
});

export { expect };
