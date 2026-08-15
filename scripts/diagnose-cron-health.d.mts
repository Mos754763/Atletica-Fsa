export type CronHeartbeatRow = {
  route_path: string;
  status: "succeeded" | "failed";
  duration_ms: number | null;
  detail: string | null;
  executed_at: string | Date;
};

export type CronDiagnosticState = "healthy" | "stale" | "failed" | "missing";

export type CronAssessment = {
  routePath: string;
  state: CronDiagnosticState;
  ageMinutes: number | null;
  status: CronHeartbeatRow["status"] | null;
  executedAt: string | null;
  durationMs: number | null;
  detail: string | null;
};

export const CRON_JOBS: ReadonlyArray<{ routePath: string; maxAgeMs: number }>;
export function assessCronHeartbeats(rows: CronHeartbeatRow[], now?: Date): CronAssessment[];
export function diagnosticExitCode(assessments: CronAssessment[], allowMissing?: boolean): 0 | 1 | 2;
