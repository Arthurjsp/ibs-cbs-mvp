import { describe, expect, it } from "vitest";
import { buildDivergenceRows } from "../lib/assisted-assessment-math";

describe("buildDivergenceRows", () => {
  it("calcula divergências para IBS/CBS/IS e effective rate", () => {
    const rows = buildDivergenceRows({
      simulated: {
        month: "2026-02",
        runCount: 3,
        ibsTotal: 100,
        cbsTotal: 60,
        isTotal: 20,
        effectiveRate: 0.18
      },
      assisted: {
        month: "2026-02",
        ibsTotal: 120,
        cbsTotal: 54,
        isTotal: 20,
        effectiveRate: 0.19
      }
    });

    expect(rows).toHaveLength(4);
    expect(rows[0]).toMatchObject({
      metric: "IBS_TOTAL",
      deltaValue: 20,
      deltaPct: 20
    });
    expect(rows[1]).toMatchObject({
      metric: "CBS_TOTAL",
      deltaValue: -6,
      deltaPct: -10
    });
    expect(rows[3]).toMatchObject({
      metric: "EFFECTIVE_RATE",
      deltaValue: 0.01
    });
  });

  it("retorna deltaPct nulo quando simulação e zero", () => {
    const rows = buildDivergenceRows({
      simulated: {
        month: "2026-02",
        runCount: 0,
        ibsTotal: 0,
        cbsTotal: 0,
        isTotal: 0,
        effectiveRate: 0
      },
      assisted: {
        month: "2026-02",
        ibsTotal: 10,
        cbsTotal: 0,
        isTotal: 0
      }
    });

    expect(rows[0].metric).toBe("IBS_TOTAL");
    expect(rows[0].deltaPct).toBeNull();
  });
});
