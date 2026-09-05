import { spawn as nodeSpawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  resolveHomologationTarget,
  resolvePreviewRequestHeaders,
} from "./qa-homologation.mjs";
import { assertProtectedPreviewTarget } from "./protected-preview-target.mjs";

export const PROTECTED_PREVIEW_TEST = "tests/e2e/public-navigation.spec.ts";
export const PROTECTED_PREVIEW_PROJECTS = ["chromium", "mobile-chromium"];
export const PLAYWRIGHT_CLI = createRequire(import.meta.url).resolve("@playwright/test/cli");
export const PROTECTED_PREVIEW_CONFIG = fileURLToPath(new URL("./playwright-protected-preview.config.ts", import.meta.url));
export const EXPECTED_PREVIEW_PROJECT_ID = "prj_9jUz7HbIbzZdMgB3BcNd1GmUUFn2";
const DIAGNOSTIC_CASES = {
  D1: "jornadas públicas sem escrita a landing apresenta a navegação principal e alcança a loja",
  D2: "jornadas públicas sem escrita a loja permite explorar detalhes e carrinho sem iniciar checkout",
  D3: "jornadas públicas sem escrita a agenda pública apresenta conteúdo ou estado vazio e oferece retorno",
  D4: "jornadas públicas sem escrita o login expõe controles públicos sem preencher ou enviar credenciais",
  D5: "jornadas públicas sem escrita uma rota ERP anônima é redirecionada ao login sem expor o painel",
};

const SOURCE_SECRET_KEYS = [
  "VERCEL_AUTOMATION_BYPASS_SECRET",
  "QA_VERCEL_PROTECTION_BYPASS_SECRET",
  "QA_VERCEL_SHARE_URL",
  "QA_PROTECTED_PREVIEW_DIAGNOSTIC_CASE",
  "QA_PROTECTED_PREVIEW_DIAGNOSTIC_PROJECT",
];
const RESOLVED_ACCESS_KEYS = [
  "QA_PROTECTED_PREVIEW_ORIGIN",
  "QA_PROTECTED_PREVIEW_USER_AGENT",
  "QA_PROTECTED_PREVIEW_BYPASS_HEADER",
  "QA_PROTECTED_PREVIEW_OUTPUT_DIR",
  "QA_PROTECTED_PREVIEW_DIAGNOSTIC_CODE",
];

function optionalValue(value) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function bypassSecretFor(environment) {
  return optionalValue(environment.VERCEL_AUTOMATION_BYPASS_SECRET)
    ?? optionalValue(environment.QA_VERCEL_PROTECTION_BYPASS_SECRET);
}

function removeAccessValues(environment) {
  for (const key of [...SOURCE_SECRET_KEYS, ...RESOLVED_ACCESS_KEYS]) delete environment[key];
}

export function protectedPreviewStatusLine(code, signal, diagnosticCode) {
  if (diagnosticCode) return `[protected-preview] ${diagnosticCode}:test:${code === 0 && !signal ? "passed" : "failed"}\n`;
  return code === 0 && !signal
    ? "[protected-preview] passed.\n"
    : "[protected-preview] failed; detailed child output suppressed.\n";
}

export function protectedPreviewCheckpoint(value, diagnosticCode) {
  const allowed = new Set(["D1:R1", "D1:A1", "D1:A2", "D1:A3", "D1:A4", "D1:A5", "D4:R1", "D4:A1", "D4:A2", "D4:A3", "D4:A4"]);
  return value && value.length <= 8 && value.startsWith(`${diagnosticCode}:`) && allowed.has(value) ? value : undefined;
}

export function protectedPreviewDiagnostic(environment) {
  const code = optionalValue(environment.QA_PROTECTED_PREVIEW_DIAGNOSTIC_CASE);
  const project = optionalValue(environment.QA_PROTECTED_PREVIEW_DIAGNOSTIC_PROJECT);
  if (!code && !project) return undefined;
  if (!code || !project || !Object.hasOwn(DIAGNOSTIC_CASES, code) || !PROTECTED_PREVIEW_PROJECTS.includes(project)) {
    throw new Error("O diagnóstico protegido exige um código D1-D5 e um único projeto Chromium allowlisted.");
  }
  return { code, project, grep: `^.*${DIAGNOSTIC_CASES[code]}$` };
}

export async function verifyProtectedPreviewIdentity(origin, headers, fetchImplementation = fetch, timeoutMs = 12_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(`${origin}/api/qa/deployment-identity`, {
      method: "GET", redirect: "manual", headers, signal: controller.signal,
    });
    if (response.status !== 200) {
      throw new Error("A identidade do deployment de homologação não foi confirmada pelo Preview.");
    }

    const identity = await response.json();
    if (
      !identity
      || identity.environment !== "preview"
      || identity.projectId !== EXPECTED_PREVIEW_PROJECT_ID
      || typeof identity.deploymentId !== "string"
      || !identity.deploymentId.trim()
      || typeof identity.gitCommitRef !== "string"
      || !identity.gitCommitRef.trim()
      || identity.gitCommitRef === "main"
    ) {
      throw new Error("A identidade do deployment não atende aos critérios de homologação protegida.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("A identidade do deployment")) throw error;
    throw new Error("A atestação do deployment de homologação não pôde ser concluída.");
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveProtectedPreviewRun(environment = process.env, fetchImplementation = fetch) {
  const baseUrl = optionalValue(environment.QA_BASE_URL);
  if (!baseUrl) {
    throw new Error("QA_BASE_URL deve informar o Preview de homologação para o E2E protegido.");
  }

  const origin = assertProtectedPreviewTarget(resolveHomologationTarget(baseUrl, environment.QA_ENVIRONMENT));
  const bypassSecret = bypassSecretFor(environment);
  const shareUrl = optionalValue(environment.QA_VERCEL_SHARE_URL);
  if (!bypassSecret) {
    if (shareUrl) {
      throw new Error("QA_VERCEL_SHARE_URL é suportada apenas pelo smoke HTTP; o E2E com redirecionamentos exige um bypass de automação da Vercel.");
    }
    throw new Error("Defina VERCEL_AUTOMATION_BYPASS_SECRET ou QA_VERCEL_PROTECTION_BYPASS_SECRET para o Preview protegido.");
  }

  const headers = await resolvePreviewRequestHeaders(bypassSecret, undefined, origin, fetchImplementation);
  const identityHeaders = { ...headers };
  delete identityHeaders["x-vercel-set-bypass-cookie"];
  await verifyProtectedPreviewIdentity(origin, identityHeaders, fetchImplementation);
  const childEnvironment = { ...environment };
  removeAccessValues(childEnvironment);
  delete childEnvironment.QA_BASE_URL;
  delete childEnvironment.QA_ENVIRONMENT;
  childEnvironment.QA_PROTECTED_PREVIEW_ORIGIN = origin;
  childEnvironment.QA_PROTECTED_PREVIEW_USER_AGENT = headers["User-Agent"];
  if (headers["x-vercel-protection-bypass"]) {
    childEnvironment.QA_PROTECTED_PREVIEW_BYPASS_HEADER = headers["x-vercel-protection-bypass"];
  }
  return { mode: "remote", origin, childEnvironment };
}

export function protectedPreviewPlaywrightArguments(diagnostic) {
  return [
    "--config",
    PROTECTED_PREVIEW_CONFIG,
    PROTECTED_PREVIEW_TEST,
    ...(diagnostic
      ? [`--project=${diagnostic.project}`, "--grep", diagnostic.grep]
      : PROTECTED_PREVIEW_PROJECTS.map((project) => `--project=${project}`)),
  ];
}

export function waitForChildExit(child) {
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => resolve({ code, signal }));
  });
}

export async function runProtectedPreviewE2E({
  environment = process.env,
  fetchImplementation = fetch,
  spawnImplementation = nodeSpawn,
} = {}) {
  const run = await resolveProtectedPreviewRun(environment, fetchImplementation);
  const childEnvironment = run.childEnvironment;
  const diagnostic = protectedPreviewDiagnostic(environment);
  const outputDir = await mkdtemp(join(tmpdir(), "atletica-fsa-protected-preview-"));
  childEnvironment.QA_PROTECTED_PREVIEW_OUTPUT_DIR = outputDir;
  if (diagnostic) childEnvironment.QA_PROTECTED_PREVIEW_DIAGNOSTIC_CODE = diagnostic.code;

  try {
    const child = spawnImplementation(
      process.execPath,
      [PLAYWRIGHT_CLI, "test", ...protectedPreviewPlaywrightArguments(diagnostic)],
      { env: childEnvironment, stdio: ["ignore", "ignore", "ignore"], shell: false },
    );
    const { code, signal } = await waitForChildExit(child);
    let checkpoint;
    if (diagnostic && (code !== 0 || signal)) {
      try { checkpoint = protectedPreviewCheckpoint(await readFile(join(outputDir, "diagnostic-checkpoint"), "utf8"), diagnostic.code); } catch {}
    }
    const statusLine = checkpoint ? `[protected-preview] ${checkpoint}\n` : protectedPreviewStatusLine(code, signal, diagnostic?.code);
    (code === 0 && !signal ? process.stdout : process.stderr).write(statusLine);
    return { mode: run.mode, origin: run.origin, exitCode: code ?? (signal ? 1 : 0) };
  } finally {
    removeAccessValues(childEnvironment);
    await rm(outputDir, { recursive: true, force: true });
  }
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  try {
    const result = await runProtectedPreviewE2E();
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Falha ao iniciar o E2E de Preview protegido.");
    process.exitCode = 1;
  }
}
