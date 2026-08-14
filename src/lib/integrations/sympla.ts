import { env } from "@/lib/env";

const SYMPLA_API_BASE_URL = "https://api.sympla.com.br/public/v1.6.0";
const DEFAULT_TIMEOUT_MS = 8_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

type FetchLike = typeof fetch;

type SymplaListResponse<T> = {
  data: T[];
  pagination?: { next_cursor?: string | null; page_size?: number; quantity?: number };
};

export type SymplaEvent = {
  id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  url: string;
  published: 0 | 1;
  cancelled: 0 | 1;
  image?: string | null;
};

export class SymplaApiError extends Error {
  constructor(message: string, public readonly status?: number, public readonly retryable = false) {
    super(message);
    this.name = "SymplaApiError";
  }
}

function getServerToken() {
  if (!env.symplaApiToken) throw new SymplaApiError("Integração Sympla não configurada.");
  return env.symplaApiToken;
}

function retryDelay(attempt: number) {
  return 250 * (2 ** attempt) + Math.floor(Math.random() * 150);
}

export async function symplaGet<T>(path: string, fetchFn: FetchLike = fetch): Promise<T> {
  const token = getServerToken();
  const url = `${SYMPLA_API_BASE_URL}${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetchFn(url, {
        method: "GET",
        headers: { s_token: token, accept: "application/json" },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
        cache: "no-store",
      });

      if (response.ok) return await response.json() as T;
      const retryable = RETRYABLE_STATUS.has(response.status);
      lastError = new SymplaApiError(`Sympla respondeu HTTP ${response.status}.`, response.status, retryable);
      if (!retryable) throw lastError;
    } catch (error) {
      const apiError = error instanceof SymplaApiError ? error : new SymplaApiError("Falha de rede ao consultar a Sympla.", undefined, true);
      lastError = apiError;
      if (!apiError.retryable) throw apiError;
    }
    if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, retryDelay(attempt)));
  }

  throw lastError instanceof Error ? lastError : new SymplaApiError("A Sympla não respondeu após as retentativas.", undefined, true);
}

export async function listSymplaEvents(cursor?: string, fetchFn?: FetchLike) {
  const query = new URLSearchParams();
  query.set("page_size", "10");
  if (cursor) query.set("cursor", cursor);
  return symplaGet<SymplaListResponse<SymplaEvent>>(`/events?${query.toString()}`, fetchFn);
}

export async function verifySymplaConnection(fetchFn?: FetchLike) {
  const response = await listSymplaEvents(undefined, fetchFn);
  return { connected: true, eventCount: response.pagination?.quantity ?? response.data.length };
}
