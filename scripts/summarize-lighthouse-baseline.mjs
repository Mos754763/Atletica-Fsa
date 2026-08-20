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

export function percentileNearestRank(values, percentile) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("A série precisa conter ao menos uma medição.");
  }
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 100) {
    throw new Error("O percentil deve estar entre 0 (exclusivo) e 100.");
  }

  const sorted = [...values];
  if (sorted.some((value) => !Number.isFinite(value))) {
    throw new Error("A série contém uma métrica numérica inválida.");
  }
  sorted.sort((a, b) => a - b);
  return sorted[Math.ceil((percentile / 100) * sorted.length) - 1];
}

export function summarizePerformanceSeries(reports) {
  if (!Array.isArray(reports) || reports.length === 0) {
    throw new Error("Informe ao menos um relatório Lighthouse para consolidar a série.");
  }

  const metric = (auditId) => reports.map((report) => report.audits?.[auditId]?.numericValue);
  const lcp = metric("largest-contentful-paint");
  const cls = metric("cumulative-layout-shift");

  return {
    sampleSize: reports.length,
    lcp: { values: lcp, median: percentileNearestRank(lcp, 50), p75: percentileNearestRank(lcp, 75) },
    cls: { values: cls, median: percentileNearestRank(cls, 50), p75: percentileNearestRank(cls, 75) },
  };
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
  const seriesMode = process.argv.includes("--performance-series");
  const inputs = process.argv.slice(2).filter((argument) => argument !== "--accessibility-details" && argument !== "--performance-series").map(parseInput);
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
  if (seriesMode) {
    const reports = await Promise.all(inputs.map(async ({ path }) => JSON.parse(await readFile(path, "utf8"))));
    console.log(JSON.stringify(summarizePerformanceSeries(reports), null, 2));
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
