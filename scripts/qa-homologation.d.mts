export type HomologationSmokeResult = {
  name: string;
  path: string;
  status?: number;
  location?: string | null;
  state: "passed" | "failed";
  error?: string;
};

export function resolveHomologationTarget(baseUrl: string, environment?: string): string;
export function resolvePreviewHeaders(bypassSecret?: string): Record<string, string>;
export function resolvePreviewShareUrl(previewShareUrl: string | undefined, origin: string): string | undefined;
export function resolvePreviewRequestHeaders(
  bypassSecret: string | undefined,
  previewShareUrl: string | undefined,
  origin: string,
  fetchImplementation?: typeof fetch,
): Promise<Record<string, string>>;
export function runHomologationSmoke(
  baseUrl: string,
  environment?: string,
  bypassSecret?: string,
): Promise<{
  checkedAt: string;
  environment?: string;
  origin: string;
  mode: "read-only";
  results: HomologationSmokeResult[];
}>;
