import { createServer } from "node:http";
import type { RequestListener } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, test } from "@playwright/test";
import { installProtectedPreviewRouting } from "./protected-preview.fixture";

async function listen(handler: RequestListener) {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { server, origin: `http://127.0.0.1:${port}` };
}

test("o bypass não atravessa um redirect para outro origin", async ({ context, page }) => {
  let initialHeaders: Record<string, string | string[] | undefined> = {};
  let externalHeaders: Record<string, string | string[] | undefined> = {};
  const external = await listen((request, response) => {
    externalHeaders = request.headers;
    response.end("external");
  });
  const initial = await listen((request, response) => {
    initialHeaders = request.headers;
    response.writeHead(302, { location: `${external.origin}/final` });
    response.end();
  });

  try {
    await installProtectedPreviewRouting(context, initial.origin, "test-only");
    await page.goto(`${initial.origin}/start`);
    expect(initialHeaders["x-vercel-protection-bypass"]).toBe("test-only");
    expect(initialHeaders["x-vercel-set-bypass-cookie"]).toBe("true");
    expect(externalHeaders["x-vercel-protection-bypass"]).toBeUndefined();
    expect(externalHeaders["x-vercel-set-bypass-cookie"]).toBeUndefined();
  } finally {
    await Promise.all([
      new Promise<void>((resolve) => initial.server.close(() => resolve())),
      new Promise<void>((resolve) => external.server.close(() => resolve())),
    ]);
  }
});
