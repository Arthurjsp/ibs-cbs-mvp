import { describe, expect, it } from "vitest";
import {
  buildExecutiveInsights,
  buildExecutiveSpotlight,
  buildReportDataset,
  parseReportTemplate,
  summarizeReportDataset
} from "../lib/reports/template";

describe("report template helpers", () => {
  it("parses template with safe fallback", () => {
    expect(parseReportTemplate("TECHNICAL")).toBe("TECHNICAL");
    expect(parseReportTemplate("INVALID")).toBe("EXECUTIVE");
    expect(parseReportTemplate(null)).toBe("EXECUTIVE");
  });

  it("builds executive dataset and summary", () => {
    const dataset = buildReportDataset({
      template: "EXECUTIVE",
      runs: [
        {
          runId: "run-1",
          month: "2026-02",
          runAt: new Date("2026-02-10T00:00:00.000Z"),
          documentKey: "NFE-1",
          documentIssueDate: new Date("2026-02-05T00:00:00.000Z"),
          scenarioName: "Baseline",
          ibsTotal: 100,
          cbsTotal: 50,
          isTotal: 0,
          creditTotal: 150,
          effectiveRate: 0.15,
          componentsJson: {
            transition: { totalTax: 150 },
            legacy: { unsupportedItemCount: 0 }
          }
        }
      ]
    });

    expect(dataset.columns.some((column) => column.key === "actionHint")).toBe(true);
    expect(dataset.rows[0]?.finalTax).toBe(150);

    const summary = summarizeReportDataset(dataset);
    expect(summary.rowCount).toBe(1);
    expect(summary.totalFinalTax).toBe(150);
    expect(summary.avgEffectiveRate).toBe(0.15);
  });

  it("builds technical dataset with transition weights", () => {
    const dataset = buildReportDataset({
      template: "TECHNICAL",
      runs: [
        {
          runId: "run-1",
          month: "2026-02",
          runAt: new Date("2026-02-10T00:00:00.000Z"),
          documentKey: "NFE-1",
          documentIssueDate: new Date("2026-02-05T00:00:00.000Z"),
          scenarioName: "Cenario X",
          ibsTotal: 100,
          cbsTotal: 50,
          isTotal: 10,
          creditTotal: 90,
          effectiveRate: 0.16,
          componentsJson: {
            transition: { totalTax: 140 },
            legacy: { unsupportedItemCount: 2 },
            weights: { year: 2030, legacy: 0.8, ibs: 0.2 }
          }
        }
      ]
    });

    const row = dataset.rows[0];
    expect(row?.transitionYear).toBe(2030);
    expect(row?.weightLegacy).toBe(0.8);
    expect(row?.unsupportedItems).toBe(2);
  });

  it("builds executive insights and spotlight", () => {
    const dataset = buildReportDataset({
      template: "EXECUTIVE",
      runs: [
        {
          runId: "run-1",
          month: "2026-02",
          runAt: new Date("2026-02-10T00:00:00.000Z"),
          documentKey: "NFE-1",
          documentIssueDate: new Date("2026-02-05T00:00:00.000Z"),
          scenarioName: "Cenario A",
          ibsTotal: 200,
          cbsTotal: 100,
          isTotal: 0,
          creditTotal: 300,
          effectiveRate: 0.30,
          componentsJson: {
            transition: { totalTax: 300 },
            legacy: { unsupportedItemCount: 1 }
          }
        },
        {
          runId: "run-2",
          month: "2026-02",
          runAt: new Date("2026-02-11T00:00:00.000Z"),
          documentKey: "NFE-2",
          documentIssueDate: new Date("2026-02-06T00:00:00.000Z"),
          scenarioName: "Cenario B",
          ibsTotal: 150,
          cbsTotal: 80,
          isTotal: 0,
          creditTotal: 50,
          effectiveRate: 0.20,
          componentsJson: {
            transition: { totalTax: 230 },
            legacy: { unsupportedItemCount: 0 }
          }
        }
      ]
    });

    const insights = buildExecutiveInsights(dataset);
    expect(insights.some((insight) => insight.severity === "HIGH")).toBe(true);
    expect(insights.some((insight) => insight.title.includes("Effective rate"))).toBe(true);

    const spotlight = buildExecutiveSpotlight(dataset, 1);
    expect(spotlight).toHaveLength(1);
    expect(spotlight[0]?.documentKey).toBe("NFE-1");
  });
});
