export const PROTECTED_PREVIEW_TEST: string;
export const PROTECTED_PREVIEW_PROJECTS: string[];
export const PLAYWRIGHT_CLI: string;
export const PROTECTED_PREVIEW_CONFIG: string;
export const EXPECTED_PREVIEW_PROJECT_ID: string;

export type RunnerEnvironment = Record<string, string | undefined>;

export type ProtectedPreviewRun = {
  mode: "remote";
  origin: string;
  childEnvironment: RunnerEnvironment;
};

export type PlaywrightChildProcess = {
  once(event: "error", listener: (error: Error) => void): unknown;
  once(event: "close", listener: (code: number | null, signal: NodeJS.Signals | null) => void): unknown;
};

export type SpawnPlaywrightProcess = (
  command: string,
  arguments_: string[],
  options: { env: RunnerEnvironment; stdio: ["ignore", "ignore", "ignore"]; shell: false },
) => PlaywrightChildProcess;

export function resolveProtectedPreviewRun(
  environment?: RunnerEnvironment,
  fetchImplementation?: typeof fetch,
): Promise<ProtectedPreviewRun>;
export function verifyProtectedPreviewIdentity(
  origin: string,
  headers: Record<string, string>,
  fetchImplementation?: typeof fetch,
  timeoutMs?: number,
): Promise<void>;
export function protectedPreviewStatusLine(code: number | null, signal: NodeJS.Signals | null, diagnosticCode?: string): string;
export function protectedPreviewDiagnostic(environment: RunnerEnvironment): { code: string; project: string; grep: string } | undefined;
export function protectedPreviewCheckpoint(value: string | undefined, diagnosticCode: string): string | undefined;
export function protectedPreviewPlaywrightArguments(diagnostic?: { code: string; project: string; grep: string }): string[];
export function waitForChildExit(
  child: PlaywrightChildProcess,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }>;
export function runProtectedPreviewE2E(options?: {
  environment?: RunnerEnvironment;
  fetchImplementation?: typeof fetch;
  spawnImplementation?: SpawnPlaywrightProcess;
}): Promise<{ mode: "remote"; origin: string; exitCode: number }>;
