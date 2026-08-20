export type LighthouseAudit = {
  displayValue?: string;
  numericValue?: number;
  title?: string;
  description?: string;
  score?: number | null;
  scoreDisplayMode?: string;
  details?: { items?: unknown[] };
};

export type LighthouseReport = {
  requestedUrl?: string;
  finalUrl?: string;
  fetchTime?: string;
  categories?: {
    performance?: { score?: number | null };
    accessibility?: { score?: number | null; auditRefs?: Array<{ id: string }> };
  };
  audits?: Record<string, LighthouseAudit>;
};

export type LighthouseBaselineSummary = {
  label: string;
  requestedUrl?: string;
  finalUrl: string;
  fetchedAt?: string;
  performance: string;
  accessibility: string;
  metrics: Record<"FCP" | "LCP" | "TBT" | "CLS" | "TTI", string>;
  failedAccessibilityAudits: string[];
};

export type AccessibilityFailure = {
  id: string;
  title?: string;
  description?: string;
  items: unknown[];
};
export type PerformanceSeries = {
  sampleSize: number;
  lcp: { values: number[]; median: number; p75: number };
  cls: { values: number[]; median: number; p75: number };
};
export function summarizeLighthouseReport(report: LighthouseReport, label: string): LighthouseBaselineSummary;
export function inspectAccessibilityFailures(report: LighthouseReport): AccessibilityFailure[];
export function percentileNearestRank(values: number[], percentile: number): number;
export function summarizePerformanceSeries(reports: LighthouseReport[]): PerformanceSeries;
export function renderMarkdownBaseline(summaries: LighthouseBaselineSummary[]): string;
