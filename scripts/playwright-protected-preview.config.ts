import { defineConfig, devices } from "@playwright/test";
import { assertProtectedPreviewTarget } from "./protected-preview-target.mjs";

function requiredInternalValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`O executor protegido não forneceu ${name}.`);
  return value;
}

const remoteBaseURL = assertProtectedPreviewTarget(requiredInternalValue("QA_PROTECTED_PREVIEW_ORIGIN"));
const remoteUserAgent = requiredInternalValue("QA_PROTECTED_PREVIEW_USER_AGENT");
requiredInternalValue("QA_PROTECTED_PREVIEW_BYPASS_HEADER");
const outputDir = requiredInternalValue("QA_PROTECTED_PREVIEW_OUTPUT_DIR");
const diagnosticCode = process.env.QA_PROTECTED_PREVIEW_DIAGNOSTIC_CODE;
if (diagnosticCode && !["D1", "D2", "D3", "D4", "D5"].includes(diagnosticCode)) {
  throw new Error("O código interno de diagnóstico protegido é inválido.");
}

export default defineConfig({
  testDir: "../tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["./protected-preview-reporter.mjs"]],
  globalSetup: "./playwright-protected-preview.global-setup.mjs",
  testMatch: "public-navigation.spec.ts",
  outputDir,
  use: {
    baseURL: new URL(remoteBaseURL).origin,
    userAgent: remoteUserAgent,
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"], userAgent: remoteUserAgent, launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined } },
    { name: "mobile-chromium", use: { ...devices["Pixel 5"], userAgent: remoteUserAgent, launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined } },
  ],
});
