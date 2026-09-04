import { EventEmitter } from "node:events";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import {
  PROTECTED_PREVIEW_PROJECTS,
  PROTECTED_PREVIEW_TEST,
  PLAYWRIGHT_CLI,
  PROTECTED_PREVIEW_CONFIG,
  EXPECTED_PREVIEW_PROJECT_ID,
  protectedPreviewPlaywrightArguments,
  resolveProtectedPreviewRun,
  runProtectedPreviewE2E,
  verifyProtectedPreviewIdentity,
} from "../../../scripts/run-protected-preview-e2e.mjs";
import { protectedPreviewRequestHeaders } from "../../../tests/e2e/protected-preview.fixture";

const previewOrigin = "https://atletica-preview-123.vercel.app";

describe("executor Playwright de Preview protegido", () => {
  it("recusa a execução sem o Preview remoto declarado", async () => {
    const fetchMock = vi.fn();

    await expect(resolveProtectedPreviewRun({ QA_ENVIRONMENT: "homologation" }, fetchMock))
      .rejects.toThrow(/QA_BASE_URL/);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recusa ambiente ausente ou diferente de homologação antes do spawn", async () => {
    const spawnMock = vi.fn();

    await expect(runProtectedPreviewE2E({
      environment: { QA_BASE_URL: previewOrigin },
      spawnImplementation: spawnMock,
    })).rejects.toThrow(/QA_ENVIRONMENT/);
    await expect(runProtectedPreviewE2E({
      environment: { QA_BASE_URL: previewOrigin, QA_ENVIRONMENT: "production" },
      spawnImplementation: spawnMock,
    })).rejects.toThrow(/QA_ENVIRONMENT/);

    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("recusa alvo local mesmo quando declarado como homologação", async () => {
    await expect(resolveProtectedPreviewRun({
      QA_BASE_URL: "http://127.0.0.1:3101",
      QA_ENVIRONMENT: "homologation",
      VERCEL_AUTOMATION_BYPASS_SECRET: "test-only",
    }, vi.fn())).rejects.toThrow(/HTTPS/);
  });

  it("recusa Production antes de trocar um acesso temporário", async () => {
    const fetchMock = vi.fn();

    await expect(resolveProtectedPreviewRun({
      QA_BASE_URL: "https://atleticafsa.site",
      QA_ENVIRONMENT: "homologation",
      QA_VERCEL_SHARE_URL: `${previewOrigin}/?_vercel_share=test-only`,
    }, fetchMock)).rejects.toThrow(/Production/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recusa link compartilhável antes de qualquer chamada ou processo filho", async () => {
    const fetchMock = vi.fn();
    const spawnMock = vi.fn();

    await expect(runProtectedPreviewE2E({
      environment: {
      QA_BASE_URL: `${previewOrigin}/loja`,
      QA_ENVIRONMENT: "homologation",
      QA_VERCEL_SHARE_URL: `${previewOrigin}/?_vercel_share=test-only`,
      },
      fetchImplementation: fetchMock,
      spawnImplementation: spawnMock,
    })).rejects.toThrow(/smoke HTTP/);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("exige atestação server-side do deployment de homologação", async () => {
    const headers = { "User-Agent": "qa" };
    const invalidFetch = vi.fn(async () => new Response(JSON.stringify({
      environment: "preview",
      projectId: EXPECTED_PREVIEW_PROJECT_ID,
      deploymentId: "deployment-test",
      gitCommitRef: "main",
    }), { status: 200 }));

    await expect(verifyProtectedPreviewIdentity(previewOrigin, headers, invalidFetch))
      .rejects.toThrow(/critérios/);
    expect(invalidFetch).toHaveBeenCalledWith(
      `${previewOrigin}/api/qa/deployment-identity`,
      expect.objectContaining({ headers }),
    );
  });

  it("mantém o timeout até a leitura do corpo da atestação terminar", async () => {
    const stalledFetch = vi.fn(async (_url, options) => new Response(new ReadableStream({
      start(controller) {
        options.signal.addEventListener("abort", () => controller.error(new Error("aborted")));
      },
    }), { status: 200 }));

    await expect(verifyProtectedPreviewIdentity(previewOrigin, { "User-Agent": "qa" }, stalledFetch, 5))
      .rejects.toThrow("A atestação do deployment de homologação não pôde ser concluída.");
  });

  it("inicia somente a especificação pública nos dois projetos Chromium e limpa o ambiente filho", async () => {
    let childEnvironment;
    let spawnedEnvironment;
    const spawnMock = vi.fn((_command, _arguments, options) => {
      childEnvironment = options.env;
      spawnedEnvironment = { ...options.env };
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("close", 7, null));
      return child;
    });

    const result = await runProtectedPreviewE2E({
      environment: {
        QA_BASE_URL: previewOrigin,
        QA_ENVIRONMENT: "homologation",
        VERCEL_AUTOMATION_BYPASS_SECRET: "test-only",
      },
      fetchImplementation: vi.fn(async () => new Response(JSON.stringify({
        environment: "preview",
        projectId: EXPECTED_PREVIEW_PROJECT_ID,
        deploymentId: "deployment-test",
        gitCommitRef: "feature/test",
      }), { status: 200 })),
      spawnImplementation: spawnMock,
    });

    expect(result).toEqual({ mode: "remote", origin: previewOrigin, exitCode: 7 });
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [PLAYWRIGHT_CLI, "test", "--config", PROTECTED_PREVIEW_CONFIG, PROTECTED_PREVIEW_TEST, "--project=chromium", "--project=mobile-chromium"],
      expect.objectContaining({ stdio: "inherit", shell: false }),
    );
    expect(PROTECTED_PREVIEW_PROJECTS).toEqual(["chromium", "mobile-chromium"]);
    expect(protectedPreviewPlaywrightArguments()).toEqual([
      "--config",
      PROTECTED_PREVIEW_CONFIG,
      PROTECTED_PREVIEW_TEST,
      "--project=chromium",
      "--project=mobile-chromium",
    ]);
    expect(childEnvironment).not.toHaveProperty("VERCEL_AUTOMATION_BYPASS_SECRET");
    expect(spawnedEnvironment).toMatchObject({
      QA_PROTECTED_PREVIEW_USER_AGENT: "ATLETICA-FSA-Homologation-QA/1.0",
      QA_PROTECTED_PREVIEW_BYPASS_HEADER: "test-only",
    });
    expect(childEnvironment).not.toHaveProperty("QA_PROTECTED_PREVIEW_USER_AGENT");
    expect(childEnvironment).not.toHaveProperty("QA_PROTECTED_PREVIEW_BYPASS_HEADER");
    expect(childEnvironment).not.toHaveProperty("QA_PROTECTED_PREVIEW_COOKIE");
  });

  it("aplica bypass somente ao origin exato do Preview", () => {
    const sourceHeaders = {
      "x-vercel-protection-bypass": "should-be-removed",
      "x-vercel-set-bypass-cookie": "true",
      accept: "text/html",
    };

    expect(protectedPreviewRequestHeaders(`${previewOrigin}/login`, sourceHeaders, previewOrigin, "test-only"))
      .toMatchObject({
        "x-vercel-protection-bypass": "test-only",
        "x-vercel-set-bypass-cookie": "true",
        accept: "text/html",
      });
    expect(protectedPreviewRequestHeaders("https://other.example.test/redirect", sourceHeaders, previewOrigin, "test-only"))
      .toEqual({ accept: "text/html" });
  });

  it("guarda a execução principal e mantém o modo remoto sem servidor ou relatório persistente", async () => {
    const [runner, config, protectedConfig] = await Promise.all([
      readFile(new URL("../../../scripts/run-protected-preview-e2e.mjs", import.meta.url), "utf8"),
      readFile(new URL("../../../playwright.config.ts", import.meta.url), "utf8"),
      readFile(new URL("../../../scripts/playwright-protected-preview.config.ts", import.meta.url), "utf8"),
    ]);

    expect(runner).toContain("if (isMainModule)");
    expect(runner).toContain("shell: false");
    expect(runner).toContain('createRequire(import.meta.url).resolve("@playwright/test/cli")');
    expect(config).not.toContain("qa-homologation.mjs");
    expect(config).not.toContain("QA_PROTECTED_PREVIEW");
    expect(config).not.toContain("QA_BASE_URL");
    expect(protectedConfig).toContain("globalSetup");
    expect(protectedConfig).toContain("testMatch: \"public-navigation.spec.ts\"");
    expect(protectedConfig).toContain('trace: "off"');
    expect(protectedConfig).toContain('screenshot: "off"');
    expect(protectedConfig).toContain('video: "off"');
  });
});
