import { describe, expect, it } from "vitest";
import { buildEffectiveRateMessage, formatCurrency, formatPercent } from "../lib/trust/effective-rate";

describe("effective rate trust messages", () => {
  it("formats currency and percent", () => {
    expect(formatCurrency(1234.5)).toBe("R$ 1234.50");
    expect(formatPercent(0.2567)).toBe("25.67%");
  });

  it("builds a message with estimated tax amount", () => {
    const result = buildEffectiveRateMessage(0.26, 100000);
    expect(result.estimatedTax).toBe(26000);
    expect(result.message).toContain("Effective rate = (IBS + CBS) / base tributável.");
    expect(result.message).toContain("R$ 26000.00");
  });
});
