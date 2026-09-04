import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/qa/deployment-identity", () => {
  it("não expõe identidade fora de Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "production");

    expect((await GET()).status).toBe(404);
  });

  it("expõe somente os marcadores mínimos no Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_PROJECT_ID", "project-test");
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", "deployment-test");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "feature/test");

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      environment: "preview",
      projectId: "project-test",
      deploymentId: "deployment-test",
      gitCommitRef: "feature/test",
    });
  });
});
