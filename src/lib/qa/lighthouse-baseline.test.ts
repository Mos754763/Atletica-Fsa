import { describe, expect, it } from "vitest";
import { inspectAccessibilityFailures, percentileNearestRank, renderMarkdownBaseline, summarizeLighthouseReport, summarizePerformanceSeries } from "../../../scripts/summarize-lighthouse-baseline.mjs";

describe("summarizeLighthouseReport", () => {
  it("preserva notas, métricas e falhas acionáveis de acessibilidade", () => {
    const summary = summarizeLighthouseReport({
      requestedUrl: "https://atleticafsa.site/",
      finalUrl: "https://atleticafsa.site/",
      fetchTime: "2026-08-20T00:00:00.000Z",
      categories: {
        performance: { score: 0.91 },
        accessibility: { score: 0.87, auditRefs: [{ id: "image-alt" }] },
      },
      audits: {
        "first-contentful-paint": { displayValue: "1.2 s" },
        "largest-contentful-paint": { displayValue: "2.3 s" },
        "total-blocking-time": { displayValue: "30 ms" },
        "cumulative-layout-shift": { displayValue: "0" },
        interactive: { displayValue: "2.4 s" },
        "image-alt": {
          title: "Imagens não possuem texto alternativo",
          score: 0,
          scoreDisplayMode: "binary",
          details: { items: [{}] },
        },
      },
    }, "Landing");

    expect(summary.performance).toBe("91");
    expect(summary.accessibility).toBe("87");
    expect(summary.metrics.LCP).toBe("2.3 s");
    expect(summary.failedAccessibilityAudits).toEqual(["Imagens não possuem texto alternativo"]);
  });

  it("gera tabela Markdown com cada rota e a lista de falhas", () => {
    const markdown = renderMarkdownBaseline([{
      label: "Loja",
      finalUrl: "https://atleticafsa.site/loja",
      performance: "90",
      accessibility: "100",
      metrics: { FCP: "1 s", LCP: "2 s", TBT: "0 ms", CLS: "0", TTI: "2 s" },
      failedAccessibilityAudits: ["Contraste insuficiente"],
    }]);

    expect(markdown).toContain("| [Loja](https://atleticafsa.site/loja) | 90 | 100 |");
    expect(markdown).toContain("**Loja:** Contraste insuficiente");
  });

  it("restringe o detalhamento aos itens de acessibilidade com falha", () => {
    const failures = inspectAccessibilityFailures({
      categories: { accessibility: { auditRefs: [{ id: "label" }, { id: "perf" }] } },
      audits: {
        label: { title: "Rótulo ausente", score: 0, scoreDisplayMode: "binary", details: { items: [{ node: { selector: "button" } }] } },
        perf: { title: "Diagnóstico não acessível", score: 1, scoreDisplayMode: "binary", details: { items: [] } },
      },
    });

    expect(failures).toEqual([expect.objectContaining({ id: "label", title: "Rótulo ausente" })]);
  });

  it("calcula mediana e p75 por posto mais próximo para uma série de LCP e CLS", () => {
    const reports = [7000, 1500, 1400, 1700, 1500].map((lcp) => ({
      audits: {
        "largest-contentful-paint": { numericValue: lcp },
        "cumulative-layout-shift": { numericValue: 0.042 },
      },
    }));

    expect(percentileNearestRank([1400, 1500, 1500, 1700, 7000], 75)).toBe(1700);
    expect(summarizePerformanceSeries(reports)).toEqual({
      sampleSize: 5,
      lcp: { values: [7000, 1500, 1400, 1700, 1500], median: 1500, p75: 1700 },
      cls: { values: [0.042, 0.042, 0.042, 0.042, 0.042], median: 0.042, p75: 0.042 },
    });
  });
});
