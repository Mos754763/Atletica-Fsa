import { readFile } from "node:fs/promises";

const METRICS = [
  ["FCP", "first-contentful-paint"],
  ["LCP", "largest-contentful-paint"],
  ["TBT", "total-blocking-time"],
  ["CLS", "cumulative-layout-shift"],
  ["TTI", "interactive"],
];

function percentage(score) {
  return score === null || score === undefined ? "n/d" : String(Math.round(score * 100));
}

export function summarizeLighthouseReport(report, label) {
  const audits = report.audits ?? {};
  const getAudit = (id) => audits[id] ?? {};
  const accessibilityAuditIds = new Set((report.categories?.accessibility?.auditRefs ?? []).map(({ id }) => id));
  const failedAccessibilityAudits = [...accessibilityAuditIds]
    .map((id) => ({ id, ...getAudit(id) }))
    .filter((audit) => audit.scoreDisplayMode !== "notApplicable" && audit.score === 0 && Array.isArray(audit.details?.items));

  return {
    label,
    requestedUrl: report.requestedUrl ?? "n/d",
    finalUrl: report.finalUrl ?? "n/d",
    fetchedAt: report.fetchTime ?? "n/d",
    performance: percentage(report.categories?.performance?.score),
    accessibility: percentage(report.categories?.accessibility?.score),
    metrics: Object.fromEntries(METRICS.map(([label, id]) => [label, getAudit(id).displayValue ?? "n/d"])),
    failedAccessibilityAudits: failedAccessibilityAudits.map((audit) => audit.title).filter(Boolean),
  };
}

export function inspectAccessibilityFailures(report) {
  const auditReferences = report.categories?.accessibility?.auditRefs ?? [];
  return auditReferences
    .map(({ id }) => ({ id, ...(report.audits?.[id] ?? {}) }))
    .filter((audit) => audit.scoreDisplayMode !== "notApplicable" && audit.score === 0 && Array.isArray(audit.details?.items))
    .map(({ id, title, description, details }) => ({ id, title, description, items: details.items }));
}

export function renderMarkdownBaseline(summaries) {
  const metricHeaders = METRICS.map(([label]) => label);
  const header = ["Rota", "Performance", "Acessibilidade", ...metricHeaders];
  const divider = header.map(() => "---");
  const rows = summaries.map((summary) => [
    `[${summary.label}](${summary.finalUrl})`,
    summary.performance,
    summary.accessibility,
    ...metricHeaders.map((metric) => summary.metrics[metric]),
  ]);

  const failures = summaries
    .filter((summary) => summary.failedAccessibilityAudits.length > 0)
    .map((summary) => `- **${summary.label}:** ${summary.failedAccessibilityAudits.join("; ")}`);

  return [
    "# Linha de base Lighthouse",
    "",
    `Gerado em ${new Date().toISOString()} a partir de auditorias não autenticadas em Production.`,
    "",
    `| ${header.join(" | ")} |`,
    `| ${divider.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
    "",
    "## Falhas de acessibilidade reportadas",
    "",
    ...(failures.length ? failures : ["Nenhuma falha de auditoria com pontuação zero foi reportada nesta amostra."]),
    "",
  ].join("\n");
}

function parseInput(argument) {
  const separator = argument.indexOf("=");
  if (separator === -1) return { label: argument, path: argument };
  return { label: argument.slice(0, separator), path: argument.slice(separator + 1) };
}

async function main() {
  const detailMode = process.argv.includes("--accessibility-details");
  const inputs = process.argv.slice(2).filter((argument) => argument !== "--accessibility-details").map(parseInput);
  if (!inputs.length) {
    throw new Error("Uso: node scripts/summarize-lighthouse-baseline.mjs 'landing=/tmp/landing.json'");
  }

  const summaries = await Promise.all(inputs.map(async ({ label, path }) => {
    const report = JSON.parse(await readFile(path, "utf8"));
    return summarizeLighthouseReport(report, label);
  }));
  if (detailMode) {
    const details = await Promise.all(inputs.map(async ({ label, path }) => {
      const report = JSON.parse(await readFile(path, "utf8"));
      return { label, failures: inspectAccessibilityFailures(report) };
    }));
    console.log(JSON.stringify(details, null, 2));
    return;
  }

  console.log(renderMarkdownBaseline(summaries));
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
