import { describe, expect, it } from "vitest";
import { buildScenarioLabData, normalizeScenarioParams } from "../lib/scenarios/lab";

describe("scenario lab helpers", () => {
  it("normalizes scenario parameters with fallback values", () => {
    expect(normalizeScenarioParams({})).toEqual({
      transitionFactor: 1,
      pricePassThroughPercent: 0,
      overrideRates: {
        ibsRate: null,
        cbsRate: null,
        isRate: null
      }
    });
  });

  it("builds impacts with baseline by document", () => {
    const data = buildScenarioLabData({
      scenarios: [
        {
          id: "scenario-1",
          name: "Repasse 50%",
          createdAt: "2026-01-01T00:00:00.000Z",
          parametersJson: {
            transitionFactor: 0.3,
            pricePassThroughPercent: 50
          }
        }
      ],
      runs: [
        {
          id: "run-baseline",
          runAt: "2026-02-10T10:00:00.000Z",
          scenarioId: null,
          documentKey: "NFE-1",
          totalValue: 1000,
          summary: {
            ibsTotal: 100,
            cbsTotal: 50,
            isTotal: 0,
            effectiveRate: 0.15,
            componentsJson: {
              transition: {
                totalTax: 150
              }
            }
          }
        },
        {
          id: "run-scenario",
          runAt: "2026-02-12T10:00:00.000Z",
          scenarioId: "scenario-1",
          documentKey: "NFE-1",
          totalValue: 1000,
          summary: {
            ibsTotal: 120,
            cbsTotal: 60,
            isTotal: 0,
            effectiveRate: 0.18,
            componentsJson: {
              transition: {
                totalTax: 180
              }
            }
          }
        }
      ]
    });

    expect(data.baseline?.runId).toBe("run-baseline");
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]?.latestRun?.runId).toBe("run-scenario");
    expect(data.rows[0]?.impact?.taxDelta).toBe(30);
    expect(data.rows[0]?.impact?.priceImpact).toBe(15);
    expect(data.rows[0]?.impact?.estimatedNetResult).toBe(835);
  });
});
