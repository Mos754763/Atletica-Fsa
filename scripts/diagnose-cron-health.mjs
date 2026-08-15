import { Client } from "pg";
import { pathToFileURL } from "node:url";

export const CRON_JOBS = [
  { routePath: "/api/cron/event-reminders", maxAgeMs: 26 * 60 * 60 * 1000 },
  { routePath: "/api/cron/sympla-sync", maxAgeMs: 26 * 60 * 60 * 1000 },
  { routePath: "/api/cron/integration-health", maxAgeMs: 8 * 24 * 60 * 60 * 1000 },
];

const HEARTBEAT_QUERY = `
  select distinct on (route_path)
    route_path,
    status,
    duration_ms,
    detail,
    executed_at
  from public.scheduled_route_heartbeats
  where route_path = any($1::text[])
  order by route_path, executed_at desc
`;

export function assessCronHeartbeats(rows, now = new Date()) {
  const latestByRoute = new Map(rows.map((row) => [row.route_path, row]));

  return CRON_JOBS.map((job) => {
    const heartbeat = latestByRoute.get(job.routePath);
    if (!heartbeat) {
      return { routePath: job.routePath, state: "missing", ageMinutes: null, status: null, executedAt: null, durationMs: null, detail: null };
    }

    const executedAt = new Date(heartbeat.executed_at);
    const ageMs = now.getTime() - executedAt.getTime();
    const state = heartbeat.status === "failed" ? "failed" : ageMs > job.maxAgeMs ? "stale" : "healthy";
    return {
      routePath: job.routePath,
      state,
      ageMinutes: Math.max(0, Math.round(ageMs / 60_000)),
      status: heartbeat.status,
      executedAt: executedAt.toISOString(),
      durationMs: heartbeat.duration_ms,
      detail: heartbeat.detail ? String(heartbeat.detail).slice(0, 180) : null,
    };
  });
}

export function diagnosticExitCode(assessments, allowMissing = false) {
  if (assessments.some((item) => item.state === "failed" || item.state === "stale")) return 2;
  if (!allowMissing && assessments.some((item) => item.state === "missing")) return 1;
  return 0;
}

async function main() {
  const databaseUrl = process.env.SUPABASE_DB_URL;
  const asJson = process.argv.includes("--json");
  const allowMissing = process.argv.includes("--allow-missing");

  if (!databaseUrl) {
    console.error("SUPABASE_DB_URL não configurada. O diagnóstico é somente leitura e requer uma connection string local do Supabase.");
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    const { rows } = await client.query(HEARTBEAT_QUERY, [CRON_JOBS.map((job) => job.routePath)]);
    const assessments = assessCronHeartbeats(rows);
    const result = {
      checkedAt: new Date().toISOString(),
      mode: "read-only",
      jobs: assessments,
      exitCode: diagnosticExitCode(assessments, allowMissing),
    };

    if (asJson) console.log(JSON.stringify(result, null, 2));
    else {
      console.log("Diagnóstico de cron ATLETICA FSA (somente leitura)");
      console.table(assessments.map((item) => ({
        rota: item.routePath,
        estado: item.state,
        últimoStatus: item.status ?? "sem heartbeat",
        idadeMinutos: item.ageMinutes ?? "-",
        executadoEm: item.executedAt ?? "-",
        duraçãoMs: item.durationMs ?? "-",
      })));
      console.log("Estados: healthy = dentro da janela; stale = execução atrasada; failed = última execução falhou; missing = ainda não há heartbeat.");
    }
    process.exitCode = result.exitCode;
  } catch (error) {
    console.error("Não foi possível consultar os heartbeats de cron. Verifique acesso de leitura ao Supabase e a SUPABASE_DB_URL local.");
    process.exitCode = 2;
  } finally {
    await client.end().catch(() => undefined);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
