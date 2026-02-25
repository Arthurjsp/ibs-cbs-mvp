import { describe, expect, it } from "vitest";
import {
  buildMonthlyRows,
  calculateVariation,
  formatMonthKey,
  monthKey,
  shiftMonthKey,
  shiftYearKey
} from "../lib/dashboard/metrics";

describe("dashboard metrics helpers", () => {
  it("builds monthly rows with aggregated totals and average effective rate", () => {
    const rows = buildMonthlyRows([
      {
        runAt: new Date("2026-02-05T00:00:00.000Z"),
        summary: { ibsTotal: 100, cbsTotal: 50, isTotal: 10, effectiveRate: 0.2 }
      },
      {
        runAt: new Date("2026-02-10T00:00:00.000Z"),
        summary: { ibsTotal: 50, cbsTotal: 20, isTotal: 5, effectiveRate: 0.3 }
      },
      {
        runAt: new Date("2026-01-10T00:00:00.000Z"),
        summary: { ibsTotal: 10, cbsTotal: 5, isTotal: 1, effectiveRate: 0.1 }
      }
    ]);

    expect(rows).toEqual([
      {
        month: "2026-01",
        ibsTotal: 10,
        cbsTotal: 5,
        isTotal: 1,
        effectiveRate: 0.1,
        simulations: 1
      },
      {
        month: "2026-02",
        ibsTotal: 150,
        cbsTotal: 70,
        isTotal: 15,
        effectiveRate: 0.25,
        simulations: 2
      }
    ]);
  });

  it("handles MoM and YoY month shifting", () => {
    expect(monthKey(new Date("2026-02-01T00:00:00.000Z"))).toBe("2026-02");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
    expect(shiftYearKey("2026-02", -1)).toBe("2025-02");
    expect(formatMonthKey("2026-02")).toContain("2026");
  });

  it("calculates variation and handles zero reference", () => {
    expect(calculateVariation(120, 100)).toEqual({ delta: 20, deltaPct: 20 });
    expect(calculateVariation(20, 0)).toEqual({ delta: 20, deltaPct: null });
  });
});
